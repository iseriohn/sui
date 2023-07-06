# Use a base image with Rust slim
ARG feature
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
ARG CIRCUIT
ARG CUR
ENV PRE=$((CUR-1))
ENV PREP=$((PRE-1))
ENV POT=pot${PTAUSIZE}
ENV ENTROPY=0000000000000000000a558a61ddc8ee4e488d647a747fe4dcc362fe2026c620
ENV R1CS="zklogin${CIRCUIT}.r1cs"
ENV ZKEY="phase2_${CIRCUIT}"


FROM base AS branch_contribution
WORKDIR /kobi/phase2
RUN wget ${URL}/${ZKEY}_${PRE}.params
RUN echo "Making second phase2 contribution by kobi (${LOCALCPU}), (${SERVERCPU})"
RUN cargo run --release --bin contribute ${ZKEY}_${PRE}.params ${ZKEY}_${CUR}.params ${ENTROPY}
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_${PRE}.params ${ZKEY}_${CUR}.params

FROM base AS branch_verify
WORKDIR /kobi/phase2
RUN wget ${URL}/${POT}_final.ptau
COPY phase2_FE_initial.zkey .
RUN echo "Making phase2 beacon contribution by kobi (${LOCALCPU}), (${SERVERCPU})"
RUN cargo run --release --bin beacon ${ZKEY}_kobi.params ${ENTROPY} ${BEACONNUM} ${ZKEY}_beacon.params
RUN cargo run --release --bin verify_single_contribution ${ZKEY}_kobi.params ${ZKEY}_beacon.params
RUN echo "Bellman import the kobi compatible params to zkey file (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey import bellman ${ZKEY}_initial.zkey ${ZKEY}_snarkjs.params ${ZKEY}_final.zkey
RUN echo "Verify the final zkey file in snarkjs (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey verify ${R1CS} /${POT}_final.ptau ${ZKEY}_final.zkey
RUN echo "Exporting verification key from the final zkey file (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS zkey export verificationkey ${ZKEY}_final.zkey vk_${CIRCUIT}.json

FROM base AS branch_test
RUN wget ${URL}/${WITNESS}
RUN wget ${URL}/${ZKEY}_final.zkey
RUN wget ${URL}/vk_${CIRCUIT}.json

RUN echo "Generating proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 prove ${ZKEY}_final.zkey ${WITNESS} proof_${CIRCUIT}.json public_${CIRCUIT}.json
RUN echo "Verifying proof (${LOCALCPU}), (${SERVERCPU})"
RUN $SNARKJS groth16 verify vk_${CIRCUIT}.json public_${CIRCUIT}.json proof_${CIRCUIT}.json

FROM branch_${feature} AS final
RUN echo "Thanks for your contribution!"