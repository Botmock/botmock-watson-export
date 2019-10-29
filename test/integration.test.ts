import { remove } from "fs-extra";
import { execSync } from "child_process";
import { join } from "path";
import { EOL } from "os";

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

describe.skip("import", () => {});

describe.skip("file contents", () => {});

describe.skip("data fetching", () => {});
