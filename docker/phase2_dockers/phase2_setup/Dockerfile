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
RUN sudo npm install -g snarkjs@0.6.10
ENV SNARKJS="snarkjs"

ENV URL="http://185.209.177.123:8099"
ENV PTAUSIZE=20
ENV BEACONNUM=10
ENV LOCALCPU="Apple M1 Pro"
ENV SERVERCPU="MD EPYC 7443P 24-Core Processor"
ARG CIRCUIT
ENV POT=pot${PTAUSIZE}


ENV R1CS="zklogin${CIRCUIT}.r1cs"
ENV ZKEY="phase2_${CIRCUIT}"


#RUN wget ${URL}/${POT}_final.ptau
COPY ${POT}_final.ptau .
COPY phase2_${CIRCUIT}_0.zkey .
RUN echo "Downloading the circuit and witness files, of size ~150M for BE"
RUN wget ${URL}/${R1CS}
RUN echo "Initiating the zkey file for the circuit, for BE may take ~4min(${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 setup ${R1CS} ${POT}_final.ptau ${ZKEY}_0.zkey
RUN echo "Bellman export the zkey file to kobi compatible params, for BE may take ~ (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey export bellman ${ZKEY}_0.zkey ${ZKEY}_0.params
RUN echo "Making first phase2 contribution by snarkjs (${LOCALCPU}), (${SERVERCPU})"
