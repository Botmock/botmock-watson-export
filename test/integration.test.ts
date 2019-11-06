import { remove, mkdirp, readFile } from "fs-extra";
import { EOL, tmpdir } from "os";
import { execSync } from "child_process";
import { join } from "path";

let execution: unknown;
const pathToDefaultOutputDirectory = join(tmpdir(), "output");

beforeEach(async () => {
  await mkdirp(pathToDefaultOutputDirectory);
  execution = execSync("npm start");
});

afterEach(async () => {
  await remove(pathToDefaultOutputDirectory);
});

describe("run", () => {
  test("outputs correct number of newlines", () => {
    expect(execution.toString().split(EOL).length).toBeGreaterThanOrEqual(9);
  });
});

describe("data fetching", () => {
  test.todo("batcher provides file writer with correct project data");
});
