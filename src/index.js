import "Assets/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {rootStore} from "Stores";

/* eslint-disable no-console */
window.js = content => console.log(JSON.stringify(content, null, 2));

import "./static/stylesheets/app.scss";
import {MuiPickersUtilsProvider} from "@material-ui/pickers";
import {observer} from "mobx-react";
import LuxonUtils from "@date-io/luxon";
import ContentCreation from "./components/content-creation";
import AsyncComponent from "Components/common/AsyncComponent";

const App = observer(() => {
  return (
    <MuiPickersUtilsProvider utils={LuxonUtils}>
      <div className="app-container">
        <AsyncComponent
          Load={() => rootStore.Initialize()}
          Render={() => <ContentCreation />}
        />
      </div>
    </MuiPickersUtilsProvider>
  );
});

render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
  document.getElementById("root")
);
