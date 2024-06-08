import { marked } from 'marked'
import { Component, JSX, createSignal, For, onMount } from 'solid-js';
import markdownContent from './other-api.md'
import { APIEntrypoint, APIParam, apis } from './other-api.data'

export function OtherAPIPage() {
  return (
    <div>
      <div class='markdown-body' style={{ margin: '0 40px' }}>
        <h1>一些奇奇怪怪的API（无稳定性保障，仅供测试）</h1>

        <For each={apis}>
          {api => <APIEntry entry={api} />}
        </For>

        <Markdown content={markdownContent} />
      </div>
    </div>
  )
}

const Markdown = (props: { content: string }) => (
  <div ref={el => {
    Promise.resolve(marked.parse(props.content, {
      gfm: true,
      breaks: true,
    })).then(html => el.innerHTML = html);
  }} />
)

// ----------------------------------------------
// Component to render each API entrypoint
const APIEntry: Component<{ entry: APIEntrypoint }> = (props) => {
  return (
    <div class="box">
      <h2 class="title is-4"><span class="tag is-info mr-2">{props.entry.method}</span> {props.entry.path}</h2>
      <Markdown content={props.entry.description} />

      <APIDebugger entry={props.entry} />
    </div>
  );
};

// ----------------------------------------------

const ParamInput: Component<{
  name: string;
  param: APIParam;
  handleInputChange: (name: string, value: any) => void;
}> = (props) => {
  const initialValue = props.param.required && props.param.example
  if (initialValue) props.handleInputChange(props.name, initialValue);

  return (
    <div class="field is-horizontal">
      <div class="field-label is-normal" style={{ "flex-basis": '100px', "flex-grow": 0 }}>
        <label class="label">
          {!!props.param.required && <span class="has-text-danger mr-1">*</span>}
          {props.name}
        </label>
      </div>

      <div class="field-body">
        <div class="control">
          <input
            class="input"
            type="text"
            style={{ 'min-width': '400px' }}
            value={initialValue || ''}
            placeholder={props.param.example && `eg. ${props.param.example}`}
            onInput={(e) => props.handleInputChange(props.name, e.currentTarget.value)} />
        </div>
        <div class="help mt-2 ml-2">
          <Markdown content={props.param.description} />
        </div>
      </div>
    </div>
  );
};
const APIDebugger: Component<{ entry: APIEntrypoint }> = (props) => {
  const [pathParamValues, setPathParamValues] = createSignal<Record<string, string>>({});
  const [getParamValues, setGetParamValues] = createSignal<Record<string, string>>({});
  const [postParamValues, setPostParamValues] = createSignal<Record<string, string>>({});

  const getHandleInputChange = (paramType: 'path' | 'query' | 'post') => (name: string, value: any) => {
    switch (paramType) {
      case 'path':
        setPathParamValues({ ...pathParamValues(), [name]: value });
        break;
      case 'query':
        setGetParamValues({ ...getParamValues(), [name]: value });
        break;
      case 'post':
        setPostParamValues({ ...postParamValues(), [name]: value });
        break;
    }
  };

  const generateUrl = (
    path: string,
    pathParams?: Record<string, APIParam>,
    queryParams?: Record<string, APIParam>
  ) => {
    let filledPath = path;
    if (pathParams) {
      Object.keys(pathParams).forEach((name) => {
        const val = pathParamValues()[name];
        if (val) {
          filledPath = filledPath.replace(`:${name}`, encodeURIComponent(val));
        }
      });
    }

    let url = location.origin + filledPath;
    if (queryParams) {
      const queryString = Object.keys(queryParams)
        .map((name) => {
          const val = getParamValues()[name];
          if (!val) return '';
          return `${name}=${encodeURIComponent(val)}`;
        })
        .filter(Boolean)
        .join('&');

      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return url;
  };

  const renderCurlCommand = () => {
    const { path, method, pathParams, queryParams, postParams } = props.entry;

    const url = generateUrl(path, pathParams, queryParams);
    let bodyString = '';

    if (postParams) {
      bodyString = JSON.stringify(
        Object.fromEntries(
          Object.entries(postParams).map(([name, param]) => [name, postParamValues()[name] || param.example || ''])
        )
      );
    }

    if (method === 'GET') {
      return <div>curl -X GET <a target='_blank' href={url}>{url}</a></div>;
    } else {
      return <div>curl -X POST <a target='_blank' href={url}>{url}</a> -H "Content-Type: application/json" -d '{bodyString}'</div>;
    }
  };

  const renderFetchCall = () => {
    const { path, method, pathParams, queryParams, postParams } = props.entry;

    const url = generateUrl(path, pathParams, queryParams);
    let bodyObject: Record<string, string> = {};

    if (postParams) {
      bodyObject = Object.fromEntries(
        Object.entries(postParams).map(([name, param]) => [name, postParamValues()[name] || param.example || ''])
      );
    }

    if (method === 'GET') {
      return `fetch('${url}', { method: 'GET' })`;
    } else {
      return `fetch('${url}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(bodyObject, null, 2).replace(/^/gm, '  ').trim()})
})`;
    }
  };

  return (
    <div>
      <ParameterSection
        title="Path Parameters"
        params={props.entry.pathParams}
        handleInputChange={getHandleInputChange("path")}
      />
      <ParameterSection
        title="Query Parameters"
        params={props.entry.queryParams}
        handleInputChange={getHandleInputChange("query")}
      />
      <ParameterSection
        title="POST Parameters"
        params={props.entry.postParams}
        handleInputChange={getHandleInputChange("post")}
      />
      <div class='field'>
        <label class='label'>Generated curl command:</label>
        <div class='control'>
          <div class='textarea is-family-monospace' tabIndex={-1}>
            {renderCurlCommand()}
          </div>
        </div>
      </div>
      <div class='field'>
        <label class='label'>Generated JavaScript fetch call:</label>
        <div class='control'>
          <textarea class='textarea is-family-monospace' readonly value={renderFetchCall()} />
        </div>
      </div>
    </div>
  );
};

function ParameterSection(props: {
  title: any,
  params: undefined | Record<string, APIParam>,
  handleInputChange: (name: string, value: any) => void
}) {
  return (
    props.params && (
      <>
        <h4 class="title is-6">{props.title}</h4>
        <form class='mb-4'>
          {Object.entries(props.params).map(([name, param]) => (
            <ParamInput
              name={name}
              param={param}
              handleInputChange={props.handleInputChange}
            />
          ))}
        </form>
      </>
    )
  );
}