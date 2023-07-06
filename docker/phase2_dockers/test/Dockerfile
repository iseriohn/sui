# Use a base image with Rust slim
FROM rust:slim AS builder
# Install system dependencies
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y sudo &&\
    apt-get install -y wget && apt-get install -y nodejs && \
    apt-get install -y npm && apt-get install -y curl git build-essential

RUN mkdir -p Mysten_Trusted_Setup
WORKDIR /Mysten_Trusted_Setup

RUN echo "Cloning forked kobigurk/phase2-bn254 repository"
RUN mkdir -p /Mysten_Trusted_Setup/kobi
RUN git clone -b mysten https://github.com/iseriohn/phase2-bn254.git /kobi
RUN sudo npm install -g snarkjs@0.6.10
ENV SNARKJS="snarkjs"

ENV URL="http://185.209.177.123:8099"
ENV PTAUSIZE=20
ENV BEACONNUM=10
ENV LOCALCPU="Apple M1 Pro"
ENV SERVERCPU="MD EPYC 7443P 24-Core Processor"
ARG CIRCUIT
ENV POT=pot${PTAUSIZE}
ENV BATCH=256
ENV WITNESS="witness${CIRCUIT}.wtns"

ENV R1CS="zklogin${CIRCUIT}.r1cs"
ENV ZKEY="phase2_${CIRCUIT}"

RUN wget ${URL}/${WITNESS}
RUN wget ${URL}/${ZKEY}_final.zkey
RUN wget ${URL}/vk_${CIRCUIT}.json

RUN echo "Generating proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 prove ${ZKEY}_final.zkey ${WITNESS} proof_${CIRCUIT}.json public_${CIRCUIT}.json
RUN echo "Verifying proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 verify vk_${CIRCUIT}.json public_${CIRCUIT}.json proof_${CIRCUIT}.json