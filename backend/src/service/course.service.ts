import { Inject, Provide } from "@midwayjs/core";
import type { Course, CreateCourseInput } from "../interface";
import { CourseRepository } from "../repository/course.repository";

@Provide()
export class CourseService {
  @Inject()
  courseRepository: CourseRepository;

  list(keyword?: string): Course[] {
    if (keyword === undefined) {
      return this.courseRepository.listAll();
    }

    return this.courseRepository.searchByKeyword(keyword);
  }

  create(input: CreateCourseInput): Course {
    return this.courseRepository.create(input);
  }
}
