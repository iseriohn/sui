# Use a base image with Rust slim
FROM rust:slim as builder

# Install system dependencies
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y sudo &&\
    apt-get install -y wget && apt-get install -y nodejs && \
    apt-get install -y npm && \
    apt-get update && apt-get install -y curl git build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy the ptau file
COPY pot20_final.ptau .

RUN sudo npm install -g snarkjs@0.6.10


ENV URL="http://185.209.177.123:8099"
ENV PTAUSIZE=20
ENV BEACONNUM=10
ENV LOCALCPU="Apple M1 Pro"
ENV SERVERCPU="MD EPYC 7443P 24-Core Processor"
ENV CIRCUIT="FE"
ENV FOLDER=${pwd}
ENV ENTROPY=0000000000000000000a558a61ddc8ee4e488d647a747fe4dcc362fe2026c620
ENV BATCH=256
ENV SNARKJS="snarkjs"
ENV R1CS="zklogin${CIRCUIT}.r1cs"
ENV WITNESS="witness${CIRCUIT}.wtns"
ENV ZKEY="phase2_${CIRCUIT}"
ENV POT=pot${PTAUSIZE}

RUN echo "Downloading the circuit and witness files, of size ~160M for BE"
RUN wget ${URL}/${R1CS}
RUN wget ${URL}/${WITNESS}
RUN echo "Initiating the zkey file for the circuit, for BE may take ~4min (${LOCALCPU}), ~1min (${SERVERCPU})"
RUN $SNARKJS groth16 setup /${R1CS} ${POT}_final.ptau ${ZKEY}_initial.zkey
RUN echo "Bellman export the zkey file to kobi compatible params, for BE may take ~35min (${LOCALCPU}), ~2min (${SERVERCPU})"
RUN $SNARKJS zkey export bellman /${ZKEY}_initial.zkey /${ZKEY}_initial.params
RUN echo "Making first phase2 contribution by snarkjs, for BE may take ~1min (${LOCALCPU}), ~20s (${SERVERCPU})"

RUN $SNARKJS zkey bellman contribute bn128 /${ZKEY}_initial.params /${ZKEY}_snarkjs.params -e="random text snarkjs"

RUN echo "Cloning forked kobigurk/phase2-bn254 repository"
RUN git clone --branch mysten https://github.com/iseriohn/phase2-bn254.git kobi

RUN echo "Verifying single contribution by kobi, for BE may take ~35s (${LOCALCPU}), ~10s (${SERVERCPU})"

WORKDIR /kobi/phase2

RUN cargo build --release --bins
CMD cargo run --release --bin verify_single_contribution /${ZKEY}_initial.params /${ZKEY}_snarkjs.params
RUN echo "Making second phase2 contribution by kobi, for BE may take ~20s (${LOCALCPU}), ~10s (${SERVERCPU})"

RUN cargo run --release --bin contribute /${ZKEY}_snarkjs.params /${ZKEY}_kobi.params random_text_kobi
RUN cargo run --release --bin verify_single_contribution /${ZKEY}_snarkjs.params /${ZKEY}_kobi.params
RUN echo "Making phase2 beacon contribution by kobi, for BE may take ~20s (${LOCALCPU}), ~10s (${SERVERCPU})"
ENV 1="FE"
RUN cargo run --release --bin beacon /${ZKEY}_kobi.params ${ENTROPY} ${BEACONNUM} /${ZKEY}_beacon.params
RUN cargo run --release --bin verify_single_contribution /${ZKEY}_kobi.params /${ZKEY}_beacon.params
RUN echo "Bellman import the kobi compatible params to zkey file, for BE may take ~1h (${LOCALCPU}), ~2.5min (${SERVERCPU})"
RUN $SNARKJS zkey import bellman /${ZKEY}_initial.zkey /${ZKEY}_beacon.params /${ZKEY}_final.zkey
RUN echo "Verify the final zkey file in snarkjs, for BE may take ~15min (${LOCALCPU}), ~1.5min (${SERVERCPU})"
RUN $SNARKJS zkey verify /${R1CS} /${POT}_final.ptau /${ZKEY}_final.zkey
RUN echo "Exporting verification key from the final zkey file, for BE may take ~0.4s (${LOCALCPU}), ~0.6s (${SERVERCPU})"
RUN $SNARKJS zkey export verificationkey /${ZKEY}_final.zkey /vk_${1}.json
RUN echo "Generating proof, for BE may take ~15s (${LOCALCPU}), ~10s (${SERVERCPU})"
RUN $SNARKJS groth16 prove /${ZKEY}_final.zkey /${WITNESS} /proof_${1}.json /public_${1}.json
RUN echo "Verifying proof, for BE may take ~0.25s (${LOCALCPU}), ~0.5s (${SERVERCPU})"
RUN $SNARKJS groth16 verify /vk_${1}.json /public_${1}.json /proof_${1}.json
WORKDIR /