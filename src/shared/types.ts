export type CliOptions = {
  check: boolean;
  write: boolean;
  patterns: string[];
};

export type FormatResult = {
  changed: boolean;
  output: string;
};

export type LineEdit = {
  afterLine: number;
  beforeLine: number;
  blankLines: number;
};
