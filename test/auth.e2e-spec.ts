import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let refreshToken: string;
  let testOrgId: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = app.get(DataSource);

    // Nettoyer les données de test
    await dataSource.query('DELETE FROM users WHERE email LIKE \'%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug LIKE \'e2e-test-%\'');
  });

  afterAll(async () => {
    // Nettoyer après les tests
    await dataSource.query('DELETE FROM users WHERE email LIKE \'%@e2e-test.com\'');
    await dataSource.query('DELETE FROM organizations WHERE slug LIKE \'e2e-test-%\'');
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should create a new user and return tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@e2e-test.com',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          organization_id: '123e4567-e89b-12d3-a456-426614174000', // UUID fictif
          role: 'member',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('access_token');
          expect(response.body).toHaveProperty('refresh_token');
          expect(response.body).toHaveProperty('expires_in', 900);
          expect(response.body).toHaveProperty('user');
          expect(response.body.user).toHaveProperty('email', 'test@e2e-test.com');
          expect(response.body.user).toHaveProperty('role', 'member');

          accessToken = response.body.access_token;
          refreshToken = response.body.refresh_token;
          testUserId = response.body.user.id;
          testOrgId = response.body.user.organization_id;
        });
    });

    it('should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@e2e-test.com',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          organization_id: testOrgId,
          role: 'member',
        })
        .expect(409);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@e2e-test.com',
          password: 'weak',
          first_name: 'Test',
          last_name: 'User',
          organization_id: testOrgId,
          role: 'member',
        })
        .expect(400);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          first_name: 'Test',
          last_name: 'User',
          organization_id: testOrgId,
          role: 'member',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@e2e-test.com',
          password: 'Password123!',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('access_token');
          expect(response.body).toHaveProperty('refresh_token');
          expect(response.body).toHaveProperty('expires_in', 900);
          expect(response.body.user.email).toBe('test@e2e-test.com');

          accessToken = response.body.access_token;
          refreshToken = response.body.refresh_token;
        });
    });

    it('should fail with incorrect password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@e2e-test.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@e2e-test.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should fail with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@e2e-test.com',
        })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', testUserId);
          expect(response.body).toHaveProperty('email', 'test@e2e-test.com');
          expect(response.body).toHaveProperty('role', 'member');
          expect(response.body).toHaveProperty('organization_id', testOrgId);
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('access_token');
          expect(response.body).toHaveProperty('refresh_token');
          expect(response.body).toHaveProperty('expires_in', 900);
          expect(response.body.user.email).toBe('test@e2e-test.com');

          // Le refresh token devrait être différent (rotation)
          expect(response.body.refresh_token).not.toBe(refreshToken);

          accessToken = response.body.access_token;
          refreshToken = response.body.refresh_token;
        });
    });

    it('should fail with revoked refresh token', () => {
      // Le token précédent devrait être révoqué après le refresh
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'old_revoked_token',
        })
        .expect(401);
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: 'invalid_token',
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout and revoke refresh tokens', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('message', 'Déconnexion réussie');
        });
    });

    it('should fail to refresh after logout', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Token Expiration', () => {
    it('access token should have 15 minutes expiration', async () => {
      // Login pour obtenir un nouveau token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@e2e-test.com',
          password: 'Password123!',
        })
        .expect(200);

      const token = loginResponse.body.access_token;
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );

      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(900); // 15 minutes = 900 seconds
    });
  });
});
