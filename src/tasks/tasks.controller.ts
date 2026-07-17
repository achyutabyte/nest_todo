import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import type { Task, TaskStatus } from './task.model';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-task-filter.dto';
import { UpdateTaskStatusDto } from './dto/update -task.dto';

@Controller('tasks')
export class TasksController {

    constructor(private tasksService: TasksService) {

    }

    @Get()
    getTasks(@Query() filterDto: GetTasksFilterDto): Task[] {
        //if we have any filter defined, call taskServices.getTaskWithFilters
        //otherwise call taskServices.getAllTasks

        if (Object.keys(filterDto).length) {
            return this.tasksService.getTaskWithFilters(filterDto);
        } else {
            return this.tasksService.getAllTasks();
        }
    }

    @Get('/:id')
    getTaskById(@Param('id') id: string): Task | undefined {
        console.log(id)
        return this.tasksService.getTaskById(id)
    }

    // @Post()
    // createTask(@Body('title') title: string, @Body('description') description: string) {
    //     console.log(title, description)
    //     return this.tasksService.createTask(title, description)
    // }


    @Post()
    createTask(@Body() createTaskDto: CreateTaskDto): Task {
        console.log(createTaskDto)
        return this.tasksService.createTask(createTaskDto)
    }

    @Delete('/:id')
    deleteTask(@Param('id') id: string): void {
        this.tasksService.deleteTask(id);
    }

    @Patch('/:id/status')
    updateTaskStatus(@Param('id') id: string, @Body() updateTaskStatusDto: UpdateTaskStatusDto): Task | undefined {
        const { status } = updateTaskStatusDto;
        return this.tasksService.updateTaskStatus(id, status);
    }


}
