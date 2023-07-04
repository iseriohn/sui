# Use a base image with Rust slim
ARG feature
FROM ubuntu:latest AS base
# Install system dependencies
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y sudo &&\
    apt-get install -y wget && apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get update && apt-get install -y curl git build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p Mysten_Trusted_Setup
WORKDIR /Mysten_Trusted_Setup

RUN echo "Cloning forked kobigurk/phase2-bn254 repository"
RUN mkdir -p /Mysten_Trusted_Setup/kobi
RUN git clone -b mysten https://github.com/iseriohn/phase2-bn254.git /kobi


ENV URL="http://185.209.177.123:8099"
ENV PTAUSIZE=20
ENV BEACONNUM=10
ENV LOCALCPU="Apple M1 Pro"
ENV SERVERCPU="MD EPYC 7443P 24-Core Processor"
ENV CIRCUIT="FE"
ENV FOLDER=${pwd}
ENV CHALLENGE=challenge_0076_reduced_${PTAUSIZE}
ENV RESPONSE=response_0076_reduced_${PTAUSIZE}
ENV POT=pot${PTAUSIZE}
ENV ENTROPY1=0000000000000000000a558a61ddc8ee4e488d647a747fe4dcc362fe2026c620
ENV ENTROPY2=0000000000000000000a558a61ddc8ee4e488d647a747fe4dcc362fe2026c620
ENV BATCH=256
ENV 1="BE"
ENV WITNESS="witness${1}.wtns"

ENV R1CS="zklogin${1}.r1cs"
ENV ZKEY="phase2_${1}"

FROM base AS branch_phase1_setup
RUN sudo npm install -g yarn
RUN mkdir -p /Mysten_Trusted_Setup/snarkjs
RUN echo "Cloning forked snarkjs repository"
RUN git clone -b mysten https://github.com/iseriohn/snarkjs.git /snarkjs
WORKDIR /snarkjs
RUN rm -rf ~/.config/yarn/link/snarkjs
RUN yarn link && npm install && npm run build && npm run buildcli
WORKDIR /../Mysten_Trusted_Setup
RUN npm init -y
RUN yarn add snarkjs
RUN rm -rf node_modules/ yarn.lock
RUN yarn link snarkjs
RUN yarn add snarkjs
ENV SNARKJS="npx snarkjs"
RUN echo "Downloading the reduced challenge file, of size ~400M"
RUN wget ${URL}/${CHALLENGE}
WORKDIR /kobi/powersoftau
RUN echo "Making beacon contribution to the reduced ppot file, may take ~12min (${LOCALCPU}), ~2min(${SERVERCPU})"
RUN cargo run --release --bin beacon_constrained ${CHALLENGE} ${RESPONSE}_beacon ${PTAUSIZE} ${BATCH} ${ENTROPY1} ${BEACONNUM}
RUN echo "Verifying beacon contribution to the reduced ppot file, may take ~25min (${LOCALCPU}), ~30min(${SERVERCPU})"
RUN cargo run --release --bin verify_transform_constrained ${CHALLENGE} ${RESPONSE}_beacon ${CHALLENGE}_beacon ${PTAUSIZE} ${BATCH}
WORKDIR /../../snarkjs
RUN echo "Initiating blank ptau file in snarkjs, may take ~15s (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau new bn128 ${PTAUSIZE} ${POT}_initial.ptau
RUN echo "Importing phase1 response file from kobi to snarkjs, may take ~15min (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau import response_no_origin ${POT}_initial.ptau ${RESPONSE}_beacon ${POT}_beacon.ptau 
RUN echo "Preparing final ptau file for phase2, may take ~7h(${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau prepare phase2 ${POT}_beacon.ptau ${POT}_final.ptau -v
RUN echo "Verifying imported ptau file, should be fine if it fails"
RUN $SNARKJS powersoftau verify ${POT}_final.ptau

FROM base AS branch_phase2_setup
RUN sudo npm install -g snarkjs@0.6.10
ENV SNARKJS="snarkjs"
COPY ${POT}_final.ptau .
RUN echo "Downloading the circuit and witness files, of size ~150M for BE"
RUN wget ${URL}/${R1CS} 
RUN echo "Initiating the zkey file for the circuit, for BE may take ~4min(${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 setup ${R1CS} ${POT}_final.ptau ${ZKEY}_initial.zkey
RUN echo "Bellman export the zkey file to kobi compatible params, for BE may take ~ (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey export bellman ${ZKEY}_initial.zkey ${ZKEY}_initial.params
RUN echo "Making first phase2 contribution by snarkjs (${LOCALCPU}), (${SERVERCPU})"

FROM base AS branch_contribution
WORKDIR $FOLDER
COPY ${ZKEY}_initial.params .
RUN $SNARKJS zkey bellman contribute bn128 ${ZKEY}_initial.params ${ZKEY}_snarkjs.params -e="random text snarkjs"
WORKDIR /kobi/phase2
RUN echo "Verifying single contribution by kobi (${LOCALCPU}), (${SERVERCPU})"
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_initial.params $FOLDER/${ZKEY}_snarkjs.params
RUN echo "Making second phase2 contribution by kobi (${LOCALCPU}), (${SERVERCPU})"
WORKDIR /kobi/phase2
RUN cargo run --release --bin contribute ${ZKEY}_snarkjs.params ${ZKEY}_kobi.params random_text_kobi
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_snarkjs.params ${ZKEY}_kobi.params
RUN echo "Making phase2 beacon contribution by kobi (${LOCALCPU}), (${SERVERCPU})"
#RUN cd $FOLDER/kobi/phase2
RUN cargo run --release --bin beacon ${ZKEY}_kobi.params ${ENTROPY2} ${BEACONNUM} ${ZKEY}_beacon.params
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_kobi.params ${ZKEY}_beacon.params
RUN echo "Bellman import the kobi compatible params to zkey file (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey import bellman ${ZKEY}_initial.zkey ${ZKEY}_snarkjs.params ${ZKEY}_final.zkey
RUN echo "Verify the final zkey file in snarkjs (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey verify ${R1CS} ${POT}_final.ptau ${ZKEY}_final.zkey
RUN echo "Exporting verification key from the final zkey file (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey export verificationkey ${ZKEY}_final.zkey vk_${1}.json

FROM base AS branch_test
RUN wget ${URL}/${WITNESS}
RUN wget ${URL}/${ZKEY}_final.zkey
RUN wget ${URL}/vk_${1}.json

RUN echo "Generating proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 prove ${ZKEY}_final.zkey ${WITNESS} proof_${1}.json public_${1}.json
RUN echo "Verifying proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 verify vk_${1}.json public_${1}.json proof_${1}.json

FROM branch_${feature} AS final
RUN echo "Thanks for your contribution!"