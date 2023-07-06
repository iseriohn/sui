# Use a base image with Rust slim
FROM rust:slim AS base
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
ENV CHALLENGE=challenge_0076_reduced_${PTAUSIZE}
ENV RESPONSE=response_0076_reduced_${PTAUSIZE}
ENV POT=pot${PTAUSIZE}
ENV ENTROPY=0000000000000000000a558a61ddc8ee4e488d647a747fe4dcc362fe2026c620
ENV BATCH=256


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
WORKDIR /kobi/powersoftau
RUN wget ${URL}/${CHALLENGE}
RUN echo "Making beacon contribution to the reduced ppot file, may take ~12min (${LOCALCPU}), ~2min(${SERVERCPU})"
RUN cargo run --release --bin beacon_constrained ${CHALLENGE} ${RESPONSE}_beacon ${PTAUSIZE} ${BATCH} ${ENTROPY} ${BEACONNUM}
RUN echo "Verifying beacon contribution to the reduced ppot file, may take ~25min (${LOCALCPU}), ~30min(${SERVERCPU})"
RUN cargo run --release --bin verify_transform_constrained ${CHALLENGE} ${RESPONSE}_beacon ${CHALLENGE}_beacon ${PTAUSIZE} ${BATCH}
WORKDIR /../../snarkjs
RUN echo "Initiating blank ptau file in snarkjs, may take ~15s (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau new bn128 ${PTAUSIZE} ${POT}_initial.ptau
RUN echo "Importing phase1 response file from kobi to snarkjs, may take ~15min (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau import response_no_origin ${POT}_initial.ptau /kobi/powersoftau/${RESPONSE}_beacon /kobi/powersoftau/${POT}_beacon.ptau 
RUN echo "Preparing final ptau file for phase2, may take ~7h(${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS powersoftau prepare phase2 /kobi/powersoftau/${POT}_beacon.ptau ${POT}_final.ptau -v
RUN echo "Verifying imported ptau file, should be fine if it fails"
RUN $SNARKJS powersoftau verify ${POT}_final.ptau
