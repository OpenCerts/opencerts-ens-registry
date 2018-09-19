import ensContract from "../contracts/ensContract.json";
import reverseRegistrarContract from "../contracts/reverseRegistrarContract.json";
import resolverContract from "../contracts/resolverContract.json";
import fifsRegistrarContract from "../contracts/fifsRegistrarContract.json";
import ENSconstructor from "ethereum-ens";

var contracts = {
  1: {
    registry: "0x314159265dd8dbb310642f98f50c066173c1259b"
  },
  3: {
    registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010"
  }
};

let ENS;
let web3Instance;

function setWeb3(aWeb3Instance) {
  web3Instance = aWeb3Instance;
}

async function getWeb3() {
  return {
    web3: web3Instance,
    provider: web3Instance.currentProvider,
    readOnly: false,
    networkId: parseInt(await web3Instance.eth.net.getId())
  };
}

function getNamehash(name) {
  return getWeb3().then(({ web3 }) => {
    var node =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (name !== "") {
      var labels = name.split(".");
      for (var i = labels.length - 1; i >= 0; i--) {
        node = web3.sha3(node + web3.sha3(labels[i]).slice(2), {
          encoding: "hex"
        });
      }
    }
    return node.toString();
  });
}

function getNamehashWithLabelHash(labelHash, nodeHash) {
  return getWeb3().then(({ web3 }) => {
    let node = web3.sha3(nodeHash + labelHash.slice(2), { encoding: "hex" });
    return node.toString();
  });
}

const getReverseRegistrarContract = () => {
  return getENS().then(async ({ ENS, web3 }) => {
    let reverseRegistrarAddr = await ENS.owner("addr.reverse");
    return {
      reverseRegistrar: web3.eth
        .contract(reverseRegistrarContract)
        .at(reverseRegistrarAddr),
      web3
    };
  });
};

const getResolverContract = addr => {
  return getWeb3().then(({ web3, networkId }) => {
    c = new web3.eth.Contract(resolverContract, {at: addr})
    return {
      resolver: web3.eth.Contract(resolverContract).at(addr),
      web3
    };
  });
};

const getENSContract = () => {
  return getWeb3().then(({ web3, networkId }) => {
    return {
      ens: new web3.eth.Contract(ensContract, {address: contracts[networkId].registry})
    };
  });
};

const getFifsRegistrarContract = () => {
  return getENS().then(async ({ ENS, web3 }) => {
    let fifsRegistrarAddr = await ENS.owner("test");
    return {
      registrar: web3.eth.Contract(fifsRegistrarContract).at(fifsRegistrarAddr),
      web3
    };
  });
};

const getENS = async (ensAddress, web3Instance) => {
  var { web3, networkId } = await getWeb3();
  if (!ENS) {
    if (!ensAddress) {
      ensAddress = contracts[networkId].registry;
    }
    ENS = new ENSconstructor(web3, ensAddress);
    contracts[networkId] = {};
    contracts[networkId].registry = ensAddress;
  }

  return { ENS, web3 };
};

const getENSEvent = (event, filter, params) =>
  getENSContract().then(({ ens }) => {
    const myEvent = ens[event](filter, params);

    return new Promise(function(resolve, reject) {
      myEvent.get(function(error, logs) {
        if (error) {
          reject(error);
        } else {
          resolve(logs);
        }
      });
    });
  });

const watchEvent = (
  { contract, addr, eventName },
  filter,
  params,
  callback
) => {
  console.log("WATCH EVENT", contract, addr, eventName);
  function eventFactory(contract, eventName, filter, params, callback) {
    const myEvent = contract[eventName](filter, params);
    console.log(myEvent);
    myEvent.watch((error, log) => {
      //console.log(event, `here in the ${contract} Event`, log)
      if (error) {
        console.error(error);
      } else {
        callback(error, log, myEvent);
      }
    });
    return myEvent;
  }

  switch (contract) {
    case "ENS":
      return getENSContract().then(({ ens }) => {
        eventFactory(ens, eventName, filter, params, callback);
      });
    case "Resolver":
      console.log("Resolver ENS WATCH");
      return getResolverContract(addr).then(({ resolver }) => {
        eventFactory(resolver, eventName, filter, params, callback);
      });
    default:
      throw new Error("Unrecognised contract");
  }
};

export default getENS;
export {
  setWeb3,
  getWeb3,
  getReverseRegistrarContract,
  getENSContract,
  getENSEvent,
  getNamehash,
  getNamehashWithLabelHash,
  getResolverContract,
  watchEvent,
  getFifsRegistrarContract
};
