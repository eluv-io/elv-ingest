import {useState, useEffect} from "react";
import { withRouter } from "react-router-dom";

const ScrollToTop = ({location, children}) => {
  const [oldLocation, setOldLocation] = useState(window.location.hash);

  useEffect(() => {
    if(location !== oldLocation) {
      new Promise(resolve => setTimeout(resolve, 100))
        .then(() => window.scrollTo(0, 0));
    }

    setOldLocation(location);
  });

  return children;
};

export default withRouter(ScrollToTop);
