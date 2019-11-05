import { mkdirp, remove, readFile, readdir } from "fs-extra";
import { tmpdir } from "os";
import { join } from "path";
import { default as FileWriter } from "../lib/file";
import { projectData } from "./fixtures";

let instance: FileWriter;
const outputDirectory = join(tmpdir(), projectData.project.platform);
beforeAll(async () => {
  await mkdirp(outputDirectory);
  instance = new FileWriter({ outputDirectory, projectData });
});

afterAll(async () => {
  await remove(outputDirectory);
});

test("dialog nodes field is correct for mock project", async () => {
  const { name } = projectData.project;
  await instance.write();
  const json = JSON.parse(await readFile(join(outputDirectory, `${name}.json`), "utf8"))
  expect(json).toHaveProperty("dialog_nodes");
  expect(json.dialog_nodes[0].dialog_node).toMatch(/node_[a-z0-9|-]+/);
});
