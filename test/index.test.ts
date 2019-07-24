// import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

test("runs", async () => {
  const { stdout, stderr } = await promisify(exec)("npm start");
  expect(stdout).toBeTruthy();
  expect(stderr).toBeFalsy();
});

test.todo("creates non-empty output directory");
test.todo("handles projects with loops");
