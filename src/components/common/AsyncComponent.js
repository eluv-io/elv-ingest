import React, {useState, useEffect} from "react";
import {PageLoader} from "Components/common/Loader";
import {observer} from "mobx-react";

const AsyncComponent = observer(({loaded, Load, children, Render, className=""}) => {
  const [isLoaded, setLoaded] = useState(loaded);
  const [error, setError] = useState(undefined);

  useEffect(() => {
    Load()
      .then(() => setLoaded(true))
      .catch(error => {
        console.error(error);
        setError(error);
      });
  }, []);

  if(error) {
    return (
      <div className={`ingest-form error-container ${className}`}>
        We're sorry, something went wrong
      </div>
    );
  }

  if(!isLoaded) {
    return <PageLoader className={className} />;
  }

  if(Render) {
    return Render();
  }

  return children;
});

export default AsyncComponent;
