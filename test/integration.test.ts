import { remove } from "fs-extra";
import { execSync } from "child_process";
import { join } from "path";
import { EOL } from "os";
// import { projectData } from "./fixtures";

describe("run", () => {
  const pathToDefaultOutputDirectory = join(process.cwd(), "output");
  afterAll(async () => {
    await remove(pathToDefaultOutputDirectory);
  });
  test("outputs correct number of newlines", () => {
    const res = execSync("npm start");
    expect(res.toString().split(EOL).length).toBeGreaterThanOrEqual(9);
  });
});

describe("file contents after npm start", () => {
  beforeEach(() => {
    execSync("npm start");
  });
  test.todo("json file has fields implied by fixture project structure");
});

describe("data fetching", () => {
  test.todo("batcher provides file writer with correct project data");
});
