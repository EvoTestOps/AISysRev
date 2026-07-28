## Instructions / details about fuzzing

**AISysRev has three types of fuzzing tools that can be found in the fuzzing folder. The tools are EvoMaster, Schemathesis and RESTler.**

### How to run the tools:

**Prerequisite:** The dev stack must be running `make start-dev`

**Notice:** No tool installation is needed: docker images are pulled and the EvoMaster jar is downloaded automatically on the first run. Only Docker is required.

**The script to running each tool is:** `./fuzzing/fuzz.sh <tool> [mode]`  

_RESTler and Schemathesis have different modes:_


RESTler

- `./fuzzing/fuzz.sh restler`   
_Sends one valid request per endpoint. Confirms the grammar works and endpoints are reachable. Fast reachability check. Length: seconds to minutes_
- `./fuzzing/fuzz.sh restler fuzz-lean`  
_Test plus one fuzzed value per request (each request tried once with a bad value). Cheap bug hunt. Length: minutes_
- `./fuzzing/fuzz.sh restler fuzz`  
_Full stateful search which explores request sequences over a time budget. The real big fuzzing task. The length can be modified in file fuzz.sh._


Schemathesis
- `./fuzzing/fuzz.sh schemathesis`  
_Fast sanity check, 5 positive inputs/op, only the "no 5xx" check_
- `./fuzzing/fuzz.sh schemathesis lean`  
_25 inputs/op, valid+invalid, core conformance checks_
- `./fuzzing/fuzz.sh schemathesis full`  
_150 inputs/op, all checks, add the stateful phase, 2 workers_


Evomaster
- `./fuzzing/fuzz.sh evomaster`  


<br>

**Where to find results:**

- For RESTler, results can be seen in the terminal and inside the restler folder under bug_buckets.
- For SchemaThesis, results can be seen also in the terminal as well as in the JUnit XML files inside the schemathesis folder after running.    
- For EvoMaster, the results are in evomaster-tests.