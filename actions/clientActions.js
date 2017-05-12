function dispatchClientAction(action){
  return {
    type: action.type,
    payload: action.payload
  }
}

module.exports.dispatchClientAction = dispatchClientAction;
