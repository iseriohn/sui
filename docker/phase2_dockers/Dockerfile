# Use a base image with Rust slim
FROM rust:slim as builder

# Install system dependencies
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y sudo &&\
    apt-get install -y wget && apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get update && apt-get install -y curl git build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN sudo npm install -g snarkjs@0.6.10


ENV URL="http://185.209.177.123:8099"
ENV PTAUSIZE=20
ENV BEACONNUM=10
ENV LOCALCPU="Apple M1 Pro"
ENV SERVERCPU="MD EPYC 7443P 24-Core Processor"
ENV CIRCUIT="FE"
ENV FOLDER=${pwd}
ARG ENTROPY
ENV ENTROPY=$ENTROPY
ARG CUR_ID
ENV CUR_ID=1
ARG PRE_ID
ENV PRE_ID=0
ENV BATCH=256
ENV SNARKJS="snarkjs"
ENV R1CS="zklogin${CIRCUIT}.r1cs"
ENV ZKEY="phase2_${CIRCUIT}"
ENV POT=pot${PTAUSIZE}

RUN echo "Downloading the circuit and witness files, of size ~160M for BE"
RUN wget ${URL}/${R1CS}

RUN echo "Cloning forked kobigurk/phase2-bn254 repository"
RUN git clone --branch mysten https://github.com/iseriohn/phase2-bn254.git kobi

RUN echo "Verifying single contribution by kobi, for BE may take ~35s (${LOCALCPU}), ~10s (${SERVERCPU})"

WORKDIR /kobi/phase2
COPY phase2_FE_0.params .
RUN cargo build


RUN echo "Making a phase2 contribution, for BE may take ~20s (${LOCALCPU}), ~10s (${SERVERCPU})"
RUN cargo run --release --bin contribute ${ZKEY}_${PRE_ID}.params ${ZKEY}_${CUR_ID}.params ${ENTROPY}

RUN echo "Making sure the previous contribution is valid, it may take ~20s (${LOCALCPU}), ~10s (${SERVERCPU})"
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_${PRE_ID}.params ${ZKEY}_${CUR_ID}.params
