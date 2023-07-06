## phase2_ceremony docker builder

This folder enlists the full list of phase2 ceremony dependencies. For simplicity we run the whole process in both server and contributor side in four main branchs.

## Instruction
Clone the repo via:
```
git clone -b docker https://github.com/iseriohn/sui.git
```

And then change your directory to:
```
cd /sui/docker/phase2_dockers
```

### Prerequisite Packages:
We recommend to use Docker to obtain a consistent execution environment. 

Make sure you have the Powers-of-tau file `pot20_final.ptau` in this directory. You can copy the file via the following command:

```
cp #path_to_pot20_final.ptau .
```

Install Docker and then run the following command to build the docker container:

**USAGE:**
```
sudo docker build -t mst_test . --build-arg CIRCUIT=<SUBCOMMAND>
```

**SUBCOMMANDS:**

    BE    BE circuit

    FE    FE circuit



Once the building phase is done then you can extract the phase2 contribution file from the image. First you need to find the image ID via the following command:
```
docker ps -all
```
and then:
```
docker cp #docker_image_ID:/phase2_FE_snarkjs.params .
```

Upload your file to the server.