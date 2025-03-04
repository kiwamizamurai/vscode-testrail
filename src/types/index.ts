import { TestCase, Suite, Section } from 'testrail-modern-client';

export interface Credentials {
  host: string;
  email: string;
  apiKey: string;
}

export interface TestCaseUpdate {
  title?: string;
  type_id?: number;
  priority_id?: number;
  estimate?: string;
  refs?: string;
  custom_preconds?: string;
  custom_steps?: string;
  custom_expected?: string;
  custom_steps_separated?: {
    content: string;
    expected: string;
  }[];
}

export interface SuiteUpdate {
  name?: string;
  description?: string;
  id?: number;
}

export interface SectionUpdate {
  name?: string;
  description?: string;
  parent_id?: number | null;
  suite_id?: number;
}

export interface RunUpdate {
  name?: string;
  description?: string;
  milestone_id?: number;
  include_all?: boolean;
  case_ids?: number[];
  refs?: string;
}

export interface TreeItem {
  id: number;
  name: string;
  description?: string;
}

export interface TestCaseItem extends TreeItem {
  testCase: TestCase;
}

export interface SuiteItem extends TreeItem {
  suite: Suite;
  projectId: number;
}

export interface SectionItem extends TreeItem {
  section: Section;
  projectId: number;
}
