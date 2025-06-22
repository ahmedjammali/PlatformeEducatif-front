
import { Class } from "./class.model";
import { School } from "./school.model";
import { Subject } from "./subject.model";
import { User } from "./user.model";

export interface Grade {
  _id?: string;
  student: User | string;
  class: Class | string;
  subject: Subject | string;
  teacher: User | string;
  examName: string;
  examType: 'controle' | 'devoir' | 'examen' | 'test' | 'oral' | 'tp' | 'autre';
  grade: number;
  coefficient: number;
  examDate: Date;
  trimester: '1er Trimestre' | '2ème Trimestre' | '3ème Trimestre';
  academicYear: string;
  comments?: string;
  appreciation?: string;
  school: School | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateGradeRequest {
  studentId: string;
  classId: string;
  subjectId: string;
  examName: string;
  examType: string;
  grade: number;
  coefficient?: number;
  examDate?: Date;
  trimester: string;
  academicYear?: string;
  comments?: string;
}

export interface StudentReport {
  student: User;
  bulletin: {
    academicYear: string;
    trimester: string;
    matieres: SubjectGrades[];
    moyenneGenerale: number;
    appreciationGenerale: string;
    totalNotes: number;
  };
}

export interface SubjectGrades {
  subject: Subject;
  grades: Grade[];
  moyenne: number;
  appreciation: string;
}
