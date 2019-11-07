import { remove, mkdirp, readFile, readdir } from "fs-extra";
import { execSync } from "child_process";
import { join } from "path";
import { EOL } from "os";

let execution: unknown;
const pathToOutputDirectory = join(process.cwd(), "output");
beforeEach(async () => {
  await mkdirp(pathToOutputDirectory);
  execution = execSync("npm start");
});

afterEach(async () => {
  await remove(pathToOutputDirectory);
});

describe("run", () => {
  test("outputs correct number of newlines", () => {
    // @ts-ignore
    expect(execution.toString().split(EOL).length).toBeGreaterThanOrEqual(9);
  });
  test("file is written to output directory", async () => {
    expect(await readdir(pathToOutputDirectory)).toHaveLength(1);
  });
});
