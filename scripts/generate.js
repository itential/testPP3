const path = require("path");
const fs = require("fs");

const files = ["package.json", "manifest.json", "README.md"];
let success = true;

const PID = process.argv[2];
const gitHubURL = process.argv[3];
const gitHubBranch = process.argv[4];
if (PID === null || PID == undefined || Number.isNaN(parseInt(PID, 10))) {
  console.error(
    "Please run this script with GitHub Project ID (integer) as an argument"
  );
  process.exit(2);
}
console.log(`Generating artifact.json file w/ ${PID} as GitHub Project ID`);

const filePath = __dirname.replace("/scripts", "");
try {
  const [packageJSON, manifest, readme] = files.map((entry) => {
    const result = fs.readFileSync(path.join(filePath, `./${entry}`), {
      encoding: "utf-8",
    });

    if (entry !== "README.md") {
      const parsedRes = JSON.parse(result);
      if (
        entry === "manifest.json" &&
        Object.prototype.hasOwnProperty.call(parsedRes, "version")
      ) {
        delete parsedRes.version;
      }
      return parsedRes;
    } else {
      return result.replace(/\.\//gm, `${gitHubURL}/-/raw/${gitHubBranch}/`);
    }
  });
    const bundles = [];
  const components = manifest.artifacts;
  components.forEach((file) => {
    try {
      const data = fs.readFileSync(path.join(filePath, `${file.location}`), {
        encoding: "utf-8",
      });
      bundles.push({ type: file.type, data: JSON.parse(data) });
      console.log(`     ⚪ (${file.type})   -   ${file.location}   -   ✅`);
    } catch (err) {
      success = false;
      console.log(
        `     ⚪  (${file.type})   -   ${file.location}   -   ❌  - ${err}`
      );
    }
  });

  const metadata = {
    name: packageJSON.name,
    version: packageJSON.version,
    description: packageJSON.description,
    license: packageJSON.license,
    repository: packageJSON.repository,
    keywords: packageJSON.keywords,
    author: packageJSON.author,
    IAPDependencies: packageJSON.IAPDependencies,
  };

  if (success) {
    console.log(`\n\nFinished successfully`);
  } else {
    console.log(`\n\nFinished with error(s)`);
    process.exit(1);
  }
  const artifact = { metadata, manifest, bundles, readme };
  fs.writeFileSync(
    path.join(filePath, "./artifact.json"),
    JSON.stringify(artifact, null, 2)
  );
} catch (err) {
  console.error(`Failed to generate artifact.json file: ${err}`);
  process.exit(1);
}