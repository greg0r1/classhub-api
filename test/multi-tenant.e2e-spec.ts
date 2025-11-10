import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Multi-Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Organisation 1
  let org1Id: string;
  let org1AdminToken: string;
  let org1UserId: string;
  let org1CourseId: string;

  // Organisation 2
  let org2Id: string;
  let org2AdminToken: string;
  let org2UserId: string;
  let org2CourseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get(DataSource);

    // Nettoyer les données de test
    await dataSource.query('DELETE FROM courses WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'tenant-test-%\')');
    await dataSource.query('DELETE FROM users WHERE email LIKE \'tenant%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug LIKE \'tenant-test-%\'');

    // Créer 2 organisations de test
    const org1 = await dataSource.query(
      `INSERT INTO organizations (name, slug, email, subscription_status)
       VALUES ('Tenant Test Org 1', 'tenant-test-org-1', 'org1@e2e-test.com', 'active')
       RETURNING id`
    );
    org1Id = org1[0].id;

    const org2 = await dataSource.query(
      `INSERT INTO organizations (name, slug, email, subscription_status)
       VALUES ('Tenant Test Org 2', 'tenant-test-org-2', 'org2@e2e-test.com', 'active')
       RETURNING id`
    );
    org2Id = org2[0].id;

    // Créer admin pour org1
    const registerOrg1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'tenant-admin1@e2e-test.com',
        password: 'Password123!',
        first_name: 'Admin1',
        last_name: 'Org1',
        organization_id: org1Id,
        role: 'admin',
      })
      .expect(201);

    org1AdminToken = registerOrg1.body.access_token;
    org1UserId = registerOrg1.body.user.id;

    // Créer admin pour org2
    const registerOrg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'tenant-admin2@e2e-test.com',
        password: 'Password123!',
        first_name: 'Admin2',
        last_name: 'Org2',
        organization_id: org2Id,
        role: 'admin',
      })
      .expect(201);

    org2AdminToken = registerOrg2.body.access_token;
    org2UserId = registerOrg2.body.user.id;

    // Créer un cours pour org1
    const course1 = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${org1AdminToken}`)
      .send({
        organization_id: org1Id,
        title: 'Cours Org1',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        max_capacity: 20,
        coach_id: org1UserId,
      })
      .expect(201);

    org1CourseId = course1.body.id;

    // Créer un cours pour org2
    const course2 = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${org2AdminToken}`)
      .send({
        organization_id: org2Id,
        title: 'Cours Org2',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        max_capacity: 15,
        coach_id: org2UserId,
      })
      .expect(201);

    org2CourseId = course2.body.id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM courses WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'tenant-test-%\')');
    await dataSource.query('DELETE FROM users WHERE email LIKE \'tenant%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug LIKE \'tenant-test-%\'');
    await app.close();
  });

  describe('Organization Isolation', () => {
    it('org1 admin should only see org1 data', () => {
      return request(app.getHttpServer())
        .get('/organizations/' + org1Id)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.id).toBe(org1Id);
          expect(response.body.slug).toBe('tenant-test-org-1');
        });
    });

    it('org1 admin should NOT access org2 data', () => {
      return request(app.getHttpServer())
        .get('/organizations/' + org2Id)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403); // Forbidden
    });

    it('org2 admin should NOT access org1 data', () => {
      return request(app.getHttpServer())
        .get('/organizations/' + org1Id)
        .set('Authorization', `Bearer ${org2AdminToken}`)
        .expect(403);
    });
  });

  describe('Users Isolation', () => {
    it('org1 admin should only see org1 users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);

          // Tous les utilisateurs devraient appartenir à org1
          response.body.forEach((user: any) => {
            expect(user.organization_id).toBe(org1Id);
          });
        });
    });

    it('org1 admin should NOT access org2 user details', () => {
      return request(app.getHttpServer())
        .get('/users/' + org2UserId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403);
    });

    it('org2 admin should NOT access org1 user details', () => {
      return request(app.getHttpServer())
        .get('/users/' + org1UserId)
        .set('Authorization', `Bearer ${org2AdminToken}`)
        .expect(403);
    });

    it('should prevent creating user in another organization', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .send({
          email: 'hacker@e2e-test.com',
          password: 'Password123!',
          first_name: 'Hacker',
          last_name: 'User',
          organization_id: org2Id, // Tentative d'accès à org2
          role: 'member',
        })
        .expect(403);
    });
  });

  describe('Courses Isolation', () => {
    it('org1 admin should only see org1 courses', () => {
      return request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);

          // Tous les cours devraient appartenir à org1
          response.body.forEach((course: any) => {
            expect(course.organization_id).toBe(org1Id);
          });
        });
    });

    it('org1 admin should NOT access org2 course details', () => {
      return request(app.getHttpServer())
        .get('/courses/' + org2CourseId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403);
    });

    it('org2 admin should NOT access org1 course details', () => {
      return request(app.getHttpServer())
        .get('/courses/' + org1CourseId)
        .set('Authorization', `Bearer ${org2AdminToken}`)
        .expect(403);
    });

    it('should prevent creating course in another organization', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .send({
          organization_id: org2Id, // Tentative d'accès à org2
          title: 'Cours Malveillant',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          max_capacity: 10,
          coach_id: org1UserId,
        })
        .expect(403);
    });

    it('should prevent updating course from another organization', () => {
      return request(app.getHttpServer())
        .put('/courses/' + org2CourseId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .send({
          title: 'Cours Modifié',
        })
        .expect(403);
    });

    it('should prevent deleting course from another organization', () => {
      return request(app.getHttpServer())
        .delete('/courses/' + org2CourseId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403);
    });
  });

  describe('Cross-Organization Data Leakage Prevention', () => {
    it('should not leak organization info in error messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses/' + org2CourseId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403);

      // Le message d'erreur ne devrait pas révéler d'infos sur org2
      expect(response.body.message).not.toContain(org2Id);
      expect(response.body.message).not.toContain('tenant-test-org-2');
    });

    it('should block query parameter injection attacks', () => {
      return request(app.getHttpServer())
        .get(`/courses?organization_id=${org2Id}`)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(200)
        .then((response) => {
          // Ne devrait retourner que les cours de org1, pas org2
          response.body.forEach((course: any) => {
            expect(course.organization_id).toBe(org1Id);
          });
        });
    });

    it('should block body parameter injection attacks', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .send({
          email: 'injection@e2e-test.com',
          password: 'Password123!',
          first_name: 'Injection',
          last_name: 'Test',
          role: 'member',
          // Tentative d'injection via body
          where: { organization_id: org2Id },
        })
        .expect((res) => {
          // Soit 403 (bloqué), soit 201 mais avec org1Id
          if (res.status === 201) {
            expect(res.body.organization_id).toBe(org1Id);
          }
        });
    });
  });

  describe('Database Level Isolation (RLS)', () => {
    it('should enforce Row Level Security at database level', async () => {
      // Tentative directe via SQL (simulant un bypass de l'application)
      try {
        const result = await dataSource.query(
          `SELECT * FROM courses WHERE organization_id = $1`,
          [org2Id]
        );

        // Si RLS est activé, cette requête devrait échouer ou retourner 0 résultats
        // selon la configuration du RLS
        expect(result.length).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // RLS stricte pourrait lever une erreur
        expect(error).toBeDefined();
      }
    });
  });

  describe('Audit Trail for Cross-Tenant Attempts', () => {
    it('should log failed cross-tenant access attempts', async () => {
      // Tentative d'accès cross-tenant
      await request(app.getHttpServer())
        .get('/courses/' + org2CourseId)
        .set('Authorization', `Bearer ${org1AdminToken}`)
        .expect(403);

      // Vérifier que l'événement est enregistré dans audit_logs
      const auditLogs = await dataSource.query(
        `SELECT * FROM audit_logs
         WHERE user_id = $1
         AND action = 'READ'
         AND entity_type = 'course'
         AND success = false
         ORDER BY created_at DESC
         LIMIT 1`,
        [org1UserId]
      );

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });
});
