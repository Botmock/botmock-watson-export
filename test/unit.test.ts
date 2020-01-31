import { mkdirp, remove, readFile } from "fs-extra";
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

describe("fields of generated json", () => {
  let json: JSON;
  beforeEach(async () => {
    await instance.write();
    const { name } = projectData.project;
    json = JSON.parse(await readFile(join(outputDirectory, `${name}.json`), "utf8"));
  });

  test("contains correct number of fields", () => {
    expect(Object.keys(json)).toHaveLength(13);
  });
  test("dialog nodes field is correct for mock project", async () => {
    expect(json).toHaveProperty("dialog_nodes");
    // @ts-ignore
    expect(json.dialog_nodes[0].dialog_node).toMatch(/node_[a-z0-9|-]+/);
  });
  test.todo("name field is the name of the mock project");
  test.todo("intents field has correct length");
  test.todo("entities field has correct length");
});
