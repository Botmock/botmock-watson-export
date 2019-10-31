import chalk from "chalk";

interface LogConfig {
  readonly s3URL?: string;
  readonly isError: boolean;
}

/**
 * Prints string to stdout
 * @param str the string to print
 * @param config object dictating which chalk method to use
 */
export default function log(str: string | number, config: LogConfig = { isError: false }): void {
  const method = !config.isError ? "dim" : "gray";
  console.info(chalk[method](`> ${str}`));
}
