
import { School } from "./school.model";
import { Subject } from "./subject.model";
import { User } from "./user.model";

export interface Class {
  _id?: string;
  name: string;
  grade: string;
  school: School | string;
  students: User[] | string[];
  academicYear: string;
  isActive: boolean;
  createdBy: User | string;
  teacherSubjects: TeacherSubject[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TeacherSubject {
  teacher: User | string;
  subjects: Subject[] | string[];
  _id?: string;
}

export interface AssignTeacherRequest {
  teacherId: string;
  subjectIds: string[];
}

export interface AddStudentRequest {
  studentId: string;
}