import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TaskRepository } from './task.repository';
import { Task } from './task.entity';
import { User } from '../auth/user.entity';
import { TaskStatus } from './task-status.enum';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('TasksService (Integration)', () => {
    let tasksService: TasksService;
    let taskRepository: TaskRepository;
    let dataSource: DataSource;
    let testUser: User;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'better-sqlite3',
                    database: ':memory:',
                    dropSchema: true,
                    entities: [Task, User],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([Task, User]),
            ],
            providers: [
                TasksService,
                TaskRepository,
            ],
        }).compile();

        tasksService = module.get<TasksService>(TasksService);
        taskRepository = module.get<TaskRepository>(TaskRepository);
        dataSource = module.get<DataSource>(DataSource);

        // Pre-create and seed a test user into the database
        const userRepo = dataSource.getRepository(User);
        testUser = userRepo.create({
            username: 'test-user',
            email: 'test@test.com',
            password: 'hashedPassword',
        });
        await userRepo.save(testUser);
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    describe('createTask', () => {
        it('persists and returns the created task associated with the user', async () => {
            const createTaskDto = { title: 'Test Task', description: 'Test Description' };
            const result = await tasksService.createTask(createTaskDto, testUser);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.title).toBe('Test Task');
            expect(result.description).toBe('Test Description');
            expect(result.status).toBe(TaskStatus.OPEN);

            // Verify database mapping and task-user relation
            const dbTask = await taskRepository.findOne({
                where: { id: result.id },
                relations: { user: true },
            });
            expect(dbTask).toBeDefined();
            expect(dbTask?.user?.id).toBe(testUser.id);
        });
    });

    describe('getTasks', () => {
        it('returns only tasks belonging to the authenticated user', async () => {
            // Seed a task for testUser
            const task1 = await tasksService.createTask({ title: 'User 1 Task', description: 'Desc' }, testUser);

            // Create and seed another user
            const userRepo = dataSource.getRepository(User);
            const otherUser = userRepo.create({
                username: 'other-user',
                email: 'other@test.com',
                password: 'password',
            });
            await userRepo.save(otherUser);

            // Seed a task for otherUser
            await tasksService.createTask({ title: 'User 2 Task', description: 'Desc' }, otherUser);

            // Fetch tasks for testUser
            const result = await tasksService.getTasks({}, testUser);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(task1.id);
            expect(result[0].title).toBe('User 1 Task');
        });

        it('applies a status filter successfully', async () => {
            await tasksService.createTask({ title: 'Open Task', description: 'Desc' }, testUser);
            const inProgressTask = await tasksService.createTask({ title: 'In Progress Task', description: 'Desc' }, testUser);
            await tasksService.updateTaskStatus(inProgressTask.id, TaskStatus.IN_PROGRESS, testUser);

            const result = await tasksService.getTasks({ status: TaskStatus.IN_PROGRESS }, testUser);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(inProgressTask.id);
            expect(result[0].status).toBe(TaskStatus.IN_PROGRESS);
        });

        it('applies a search query successfully', async () => {
            const matchTask = await tasksService.createTask({ title: 'Find Me Task', description: 'Specific keyword' }, testUser);
            await tasksService.createTask({ title: 'Ignore Task', description: 'Desc' }, testUser);

            const result = await tasksService.getTasks({ search: 'keyword' }, testUser);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(matchTask.id);
        });

        it('throws InternalServerErrorException on query failure', async () => {
            jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValueOnce({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockRejectedValueOnce(new Error('Database Error')),
            } as any);

            await expect(tasksService.getTasks({}, testUser)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('getTaskById', () => {
        it('retrieves a task by ID successfully', async () => {
            const task = await tasksService.createTask({ title: 'Task', description: 'Desc' }, testUser);
            const result = await tasksService.getTaskById(task.id, testUser);
            expect(result).toBeDefined();
            expect(result.id).toBe(task.id);
        });

        it('throws NotFoundException if task does not exist', async () => {
            await expect(tasksService.getTaskById('non-existent-uuid', testUser)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('throws NotFoundException if task belongs to a different user', async () => {
            const userRepo = dataSource.getRepository(User);
            const otherUser = userRepo.create({ username: 'other', email: 'other@test.com', password: 'pw' });
            await userRepo.save(otherUser);

            const task = await tasksService.createTask({ title: 'Other Task', description: 'Desc' }, otherUser);

            await expect(tasksService.getTaskById(task.id, testUser)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('deleteTask', () => {
        it('deletes the task successfully if owned by user', async () => {
            const task = await tasksService.createTask({ title: 'Delete me', description: 'Desc' }, testUser);
            await tasksService.deleteTask(task.id, testUser);

            // Verify it was deleted
            const dbTask = await taskRepository.findOne({ where: { id: task.id } });
            expect(dbTask).toBeNull();
        });

        it('throws NotFoundException if attempting to delete non-owned task', async () => {
            const userRepo = dataSource.getRepository(User);
            const otherUser = userRepo.create({ username: 'other', email: 'other@test.com', password: 'pw' });
            await userRepo.save(otherUser);

            const task = await tasksService.createTask({ title: 'Other Task', description: 'Desc' }, otherUser);

            await expect(tasksService.deleteTask(task.id, testUser)).rejects.toThrow(
                NotFoundException,
            );

            // Verify it still exists in the DB
            const dbTask = await taskRepository.findOne({ where: { id: task.id } });
            expect(dbTask).toBeDefined();
        });
    });

    describe('updateTaskStatus', () => {
        it('updates task status successfully if owned by user', async () => {
            const task = await tasksService.createTask({ title: 'Task', description: 'Desc' }, testUser);
            const result = await tasksService.updateTaskStatus(task.id, TaskStatus.DONE, testUser);

            expect(result.status).toBe(TaskStatus.DONE);

            const dbTask = await taskRepository.findOne({ where: { id: task.id } });
            expect(dbTask?.status).toBe(TaskStatus.DONE);
        });
    });
});
