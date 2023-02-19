import { createSignal, lazy, Suspense } from "solid-js";
import { render } from "solid-js/web";
import { TTSPage } from "./tts";
import './index.css';

const App = () => {
  return <div>
    <Suspense>
      <TTSPage />
    </Suspense>
  </div>
};

render(App, document.getElementById("app")!);