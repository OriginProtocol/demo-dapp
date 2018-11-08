#!/bin/bash

set -e

set -o pipefail

GCLOUD_REGISTRY=gcr.io
GCLOUD_PROJECT=origin-214503

function usage() {
  echo "Manage Origin Protocol "
  echo
  echo "Usage:"
  echo "  $0 -n namespace [-c container] [-h]"
  echo
  echo "Options:"
  echo -e "  -n \t Namespace to update the Helm release for."
  echo -e "  -c \t Container to build and deploy. Optional."
  echo -e "  -h \t Show this help."
  echo
}

function build_and_push_container() {
  DOCKERFILE=dockerfiles/${CONTAINER}

  if [ ! -e "$DOCKERFILE" ]; then
    echo -e "\033[31mDockerfile not found at ./${DOCKERFILE} \033[0m"
    exit 1
  fi

  DEPLOYED_TAG=`cat ${VALUES_PATH}/${VALUES_FILE} | grep ${IMAGE_TAG_FIELD} | cut -d " " -f 2 | tr -d "'"`

  echo -e "Deployed container tag is \033[94m${DEPLOYED_TAG}\033[0m"

  # Get short git hash from remote repo
  GIT_HASH=$(git ls-remote -h git@github.com:OriginProtocol/origin.git ${BRANCH} | cut -c1-7)
  DEPLOY_TAG=${GIT_HASH}

  if [ "$DEPLOYED_TAG" == "$GIT_HASH" ]; then
    echo -e "\033[31mDeployed container tag is the same as new deploy tag, appending unix timestamp to tag to force Kubernetes to update deployment\033[0m"
    DEPLOY_TAG=${DEPLOY_TAG}-`date +%s`
  fi

  echo -ne "This will build and deploy a container for \033[94m${CONTAINER}@${GIT_HASH}\033[0m, proceed (y/n)? "
  read answer

  if [ "$answer" != "${answer#[Nn]}" ] ;then
    exit
  fi

  echo -e "Building container for \033[94m${CONTAINER}... \033[0m"
  if [[ "${CONTAINER}" == "origin-dapp" ]]; then
    ENVKEY=$(cat ${VALUES_PATH}/${SECRETS_FILE} | grep dappEnvKey | cut -d " " -f 2)
  else
    ENVKEY=false
  fi

  docker build ../ \
    -f ${DOCKERFILE} \
    -t ${GCLOUD_REGISTRY}/${GCLOUD_PROJECT}/${NAMESPACE}/${CONTAINER}:${DEPLOY_TAG} \
    --build-arg DEPLOY_TAG=${DEPLOY_TAG} \
    --build-arg ENVKEY=${ENVKEY}

  echo -e "Pushing container to \033[94m${GCLOUD_REGISTRY}... \033[0m"
  docker push ${GCLOUD_REGISTRY}/${GCLOUD_PROJECT}/${NAMESPACE}/${CONTAINER}:${DEPLOY_TAG}
}

function decrypt_secrets() {
  VALUES_PATH=kubernetes/values
  VALUES_FILE=values-${NAMESPACE}.yaml
  SECRETS_FILE=secrets-${NAMESPACE}.yaml
  SECRETS_FILE_ENC=secrets-${NAMESPACE}.enc.yaml

  out=$(sops --decrypt ${VALUES_PATH}/${SECRETS_FILE_ENC}) && [[ -n "$out" ]] && echo "$out" > ${VALUES_PATH}/${SECRETS_FILE}
}

function update_values() {
  echo -e 'Updating chart values with new tag for container'
  sed -i.old "s|^${IMAGE_TAG_FIELD}: .*|${IMAGE_TAG_FIELD}: '${DEPLOY_TAG}'|g" ${VALUES_PATH}/${VALUES_FILE} && rm ${VALUES_PATH}/${VALUES_FILE}.old
  echo -e "\033[31mUpdated values file at ${VALUES_PATH}/${VALUES_FILE}, this should be committed!\033[0m"
}

function update_helm_release() {
  echo 'Updating Helm release'
  helm upgrade ${NAMESPACE} \
    kubernetes/charts/origin \
    -f kubernetes/charts/origin/values.yaml \
    -f ${VALUES_PATH}/${VALUES_FILE} \
    -f ${VALUES_PATH}/${SECRETS_FILE}
}

while getopts ":c:n:h" opt; do
  case $opt in
    c)
      CONTAINER=$OPTARG
      case "$CONTAINER" in
        origin-dapp)
	  IMAGE_TAG_FIELD=dappImageTag
	  ;;
        origin-bridge)
	  IMAGE_TAG_FIELD=bridgeImageTag
	  ;;
        origin-messaging)
	  IMAGE_TAG_FIELD=messagingImageTag
	  ;;
	origin-faucet)
	  IMAGE_TAG_FIELD=faucetImageTag
	  ;;
	origin-discovery)
	  IMAGE_TAG_FIELD=discoveryImageTag
	  ;;
	event-listener)
	  IMAGE_TAG_FIELD=eventlistenerImageTag
	  ;;
	ipfs-proxy)
	  IMAGE_TAG_FIELD=ipfsProxyImageTag
	  ;;
	origin-notifications)
	  IMAGE_TAG_FIELD=notificationsImageTag
	  ;;
	*)
	  echo -e "\033[31mContainer not yet implemented\033[0m"
	  exit 1
      esac
      ;;
    n)
      NAMESPACE=$OPTARG
      case "$NAMESPACE" in
        dev)
	  echo -e "\033[31mDev deployments are now handled by CI/CD\033[0m"
	  exit 1
	  ;;
        staging)
	  echo -e "\033[31mStaging deployments are now handled by CI/CD\033[0m"
	  exit 1
	  ;;
        prod)
          BRANCH=stable
	  ;;
	*)
	  echo -e "\033[31mInvalid namespace\033[0m"
	  exit 1
     esac
      ;;
    h)
      usage
      exit 0
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      exit 1
      ;;
  esac
done

if [ ! "$NAMESPACE" ]; then
  usage
  exit 1
fi

decrypt_secrets

if [ "$CONTAINER" ]; then
  build_and_push_container
  update_values
fi

update_helm_release
