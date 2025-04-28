
function terminate(options = { coredump: false, timeout: 500 }) {
  const exit = code => {
    options.coredump ? process.abort() : process.exit(code);
  }

  return (code, reason) => (err, promise) => {
    // If the error is already handled by Express, don't log it here
    if (err && err.handledByExpress) {
      return; // Skip logging the error here
    }
    if (err && err instanceof Error) {
      console.log(`An error occurred during processing: ${err}\nStack trace: ${err.stack}`);

    }
  };
}

module.exports = terminate;