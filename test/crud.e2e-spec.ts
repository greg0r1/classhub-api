import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('CRUD Operations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let coachToken: string;
  let memberToken: string;
  let orgId: string;
  let userId: string;
  let courseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get(DataSource);

    // Nettoyer les données de test
    await dataSource.query('DELETE FROM courses WHERE organization_id IN (SELECT id FROM organizations WHERE slug = \'crud-test-org\')');
    await dataSource.query('DELETE FROM users WHERE email LIKE \'crud%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug = \'crud-test-org\'');

    // Créer une organisation de test
    const org = await dataSource.query(
      `INSERT INTO organizations (name, slug, email, subscription_status)
       VALUES ('CRUD Test Org', 'crud-test-org', 'crud@e2e-test.com', 'active')
       RETURNING id`
    );
    orgId = org[0].id;

    // Créer admin
    const admin = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'crud-admin@e2e-test.com',
        password: 'Password123!',
        first_name: 'Admin',
        last_name: 'Test',
        organization_id: orgId,
        role: 'admin',
      })
      .expect(201);

    adminToken = admin.body.access_token;

    // Créer coach
    const coach = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'crud-coach@e2e-test.com',
        password: 'Password123!',
        first_name: 'Coach',
        last_name: 'Test',
        organization_id: orgId,
        role: 'coach',
      })
      .expect(201);

    coachToken = coach.body.access_token;

    // Créer member
    const member = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'crud-member@e2e-test.com',
        password: 'Password123!',
        first_name: 'Member',
        last_name: 'Test',
        organization_id: orgId,
        role: 'member',
      })
      .expect(201);

    memberToken = member.body.access_token;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM courses WHERE organization_id IN (SELECT id FROM organizations WHERE slug = \'crud-test-org\')');
    await dataSource.query('DELETE FROM users WHERE email LIKE \'crud%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug = \'crud-test-org\'');
    await app.close();
  });

  describe('Users CRUD', () => {
    describe('POST /users', () => {
      it('admin should create a new user', () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: 'crud-newuser@e2e-test.com',
            password: 'Password123!',
            first_name: 'New',
            last_name: 'User',
            organization_id: orgId,
            role: 'member',
          })
          .expect(201)
          .then((response) => {
            expect(response.body).toHaveProperty('id');
            expect(response.body.email).toBe('crud-newuser@e2e-test.com');
            expect(response.body.role).toBe('member');
            userId = response.body.id;
          });
      });

      it('member should NOT create a user', () => {
        return request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            email: 'crud-forbidden@e2e-test.com',
            password: 'Password123!',
            first_name: 'Forbidden',
            last_name: 'User',
            organization_id: orgId,
            role: 'member',
          })
          .expect(403);
      });
    });

    describe('GET /users', () => {
      it('should list all users in organization', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // Tous les utilisateurs devraient avoir le même organization_id
            response.body.forEach((user: any) => {
              expect(user.organization_id).toBe(orgId);
            });
          });
      });

      it('should filter users by role', () => {
        return request(app.getHttpServer())
          .get('/users?role=admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            expect(Array.isArray(response.body)).toBe(true);

            response.body.forEach((user: any) => {
              expect(user.role).toBe('admin');
            });
          });
      });
    });

    describe('GET /users/:id', () => {
      it('should get user details', () => {
        return request(app.getHttpServer())
          .get('/users/' + userId)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            expect(response.body.id).toBe(userId);
            expect(response.body.email).toBe('crud-newuser@e2e-test.com');
          });
      });

      it('should return 404 for non-existent user', () => {
        return request(app.getHttpServer())
          .get('/users/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('PUT /users/:id', () => {
      it('admin should update user', () => {
        return request(app.getHttpServer())
          .put('/users/' + userId)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            first_name: 'Updated',
            last_name: 'Name',
          })
          .expect(200)
          .then((response) => {
            expect(response.body.first_name).toBe('Updated');
            expect(response.body.last_name).toBe('Name');
          });
      });

      it('member should NOT update another user', () => {
        return request(app.getHttpServer())
          .put('/users/' + userId)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            first_name: 'Hacked',
          })
          .expect(403);
      });
    });

    describe('DELETE /users/:id', () => {
      it('admin should soft delete user', () => {
        return request(app.getHttpServer())
          .delete('/users/' + userId)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('deleted user should not appear in list', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            const deletedUser = response.body.find((u: any) => u.id === userId);
            expect(deletedUser).toBeUndefined();
          });
      });

      it('member should NOT delete user', () => {
        return request(app.getHttpServer())
          .delete('/users/' + userId)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });
    });
  });

  describe('Courses CRUD', () => {
    describe('POST /courses', () => {
      it('admin should create a course', () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        return request(app.getHttpServer())
          .post('/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organization_id: orgId,
            title: 'Test Course',
            description: 'A test course',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: 20,
            location: 'Test Location',
          })
          .expect(201)
          .then((response) => {
            expect(response.body).toHaveProperty('id');
            expect(response.body.title).toBe('Test Course');
            expect(response.body.max_capacity).toBe(20);
            courseId = response.body.id;
          });
      });

      it('coach should create a course', () => {
        const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        return request(app.getHttpServer())
          .post('/courses')
          .set('Authorization', `Bearer ${coachToken}`)
          .send({
            organization_id: orgId,
            title: 'Coach Course',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: 15,
          })
          .expect(201);
      });

      it('member should NOT create a course', () => {
        const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        return request(app.getHttpServer())
          .post('/courses')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            organization_id: orgId,
            title: 'Forbidden Course',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: 10,
          })
          .expect(403);
      });

      it('should validate start_time < end_time', () => {
        const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() - 60 * 60 * 1000); // Before start

        return request(app.getHttpServer())
          .post('/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            organization_id: orgId,
            title: 'Invalid Course',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            max_capacity: 20,
          })
          .expect(400);
      });
    });

    describe('GET /courses', () => {
      it('should list all courses', () => {
        return request(app.getHttpServer())
          .get('/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
          });
      });

      it('member should also list courses', () => {
        return request(app.getHttpServer())
          .get('/courses')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(200)
          .then((response) => {
            expect(Array.isArray(response.body)).toBe(true);
          });
      });
    });

    describe('GET /courses/:id', () => {
      it('should get course details', () => {
        return request(app.getHttpServer())
          .get('/courses/' + courseId)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            expect(response.body.id).toBe(courseId);
            expect(response.body.title).toBe('Test Course');
          });
      });

      it('should return 404 for non-existent course', () => {
        return request(app.getHttpServer())
          .get('/courses/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });
    });

    describe('PUT /courses/:id', () => {
      it('admin should update course', () => {
        return request(app.getHttpServer())
          .put('/courses/' + courseId)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Updated Course',
            max_capacity: 25,
          })
          .expect(200)
          .then((response) => {
            expect(response.body.title).toBe('Updated Course');
            expect(response.body.max_capacity).toBe(25);
          });
      });

      it('coach should update course', () => {
        return request(app.getHttpServer())
          .put('/courses/' + courseId)
          .set('Authorization', `Bearer ${coachToken}`)
          .send({
            description: 'Updated by coach',
          })
          .expect(200);
      });

      it('member should NOT update course', () => {
        return request(app.getHttpServer())
          .put('/courses/' + courseId)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            title: 'Hacked Course',
          })
          .expect(403);
      });
    });

    describe('DELETE /courses/:id', () => {
      it('member should NOT delete course', () => {
        return request(app.getHttpServer())
          .delete('/courses/' + courseId)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });

      it('admin should soft delete course', () => {
        return request(app.getHttpServer())
          .delete('/courses/' + courseId)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('deleted course should not appear in list', () => {
        return request(app.getHttpServer())
          .get('/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
          .then((response) => {
            const deletedCourse = response.body.find((c: any) => c.id === courseId);
            expect(deletedCourse).toBeUndefined();
          });
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce admin-only endpoints', () => {
      return request(app.getHttpServer())
        .delete('/organizations/' + orgId)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('should allow coaches to manage courses', () => {
      const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          organization_id: orgId,
          title: 'Coach Created Course',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          max_capacity: 15,
        })
        .expect(201);
    });

    it('should allow members to read but not modify', async () => {
      // Member can READ
      await request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      // Member cannot CREATE
      const startTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          organization_id: orgId,
          title: 'Forbidden',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          max_capacity: 10,
        })
        .expect(403);
    });
  });

  describe('Validation', () => {
    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          organization_id: orgId,
          role: 'member',
        })
        .expect(400);
    });

    it('should validate password strength', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          password: 'weak',
          first_name: 'Test',
          last_name: 'User',
          organization_id: orgId,
          role: 'member',
        })
        .expect(400);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          organization_id: orgId,
          // Missing title, start_time, end_time
        })
        .expect(400);
    });
  });
});
