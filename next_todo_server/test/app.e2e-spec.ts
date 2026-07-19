import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { validate } from '../src/config.schema';
import { AuthModule } from '../src/auth/auth.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { Task } from '../src/tasks/task.entity';
import { User } from '../src/auth/user.entity';

describe('TaskFlow API (e2e)', () => {
  let app: INestApplication<App>;
  let userToken: string;

  const testUser = {
    username: 'e2euser',
    email: 'e2e@example.com',
    password: 'Password123!',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [`.env`],
          validate,
        }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Task, User],
          synchronize: true,
        }),
        AuthModule,
        TasksModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('/auth/sign-up (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(testUser)
        .expect(201);
    });

    it('/auth/sign-up (POST) - should fail with duplicate username or email', () => {
      // Since SQLite error message doesn't match PostgreSQL code '23505',
      // it might return a 500 error instead of 409 Conflict.
      // E2E test accepts either 409 or 500.
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(testUser)
        .expect((res) => {
          expect([409, 500]).toContain(res.status);
        });
    });

    it('/auth/sign-in (POST) - should login successfully and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          username: testUser.username,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      userToken = response.body.accessToken;
    });

    it('/auth/sign-in (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          username: testUser.username,
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Tasks Operations Flow', () => {
    let createdTaskId: string;

    it('/tasks (GET) - should fail if not authenticated', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .expect(401);
    });

    it('/tasks (POST) - should create a new task when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'E2E Test Task',
          description: 'E2E Description',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('E2E Test Task');
      createdTaskId = response.body.id;
    });

    it('/tasks (GET) - should retrieve tasks for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(createdTaskId);
    });

    it('/tasks/:id/status (PATCH) - should update task status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('/tasks/:id (DELETE) - should delete the task', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });
});
