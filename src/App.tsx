import { ReactNode, useState, useRef, ChangeEvent } from 'react';
import axios from 'axios';
import mic from './mic.png'
import send from './send.png'
import './app.css';

function App() {
  // variable types
  type ConversationType = {
    message: ReactNode,
    user: "user" | "system",
    keyword: string,
  }

  // speech to text
  const recognition = new (window as any).webkitSpeechRecognition()
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event: any) => {
    const result = event.results[0][0].transcript;
    setText(result.toLowerCase().replace(".", ""));
  };
  // recognition.onspeechend = () => {
  //   recognition.stop();
  // };
  const startListening = () => {
    recognition.start();
  };

  // application state variables
  const applications = ["azure", "jenkins", "jira"]
  const [application, setApplication] = useState('')
  const [project, setProject] = useState('')
  const [release, setRelease] = useState('')
  const [conversation, setConversation] = useState<ConversationType[]>([])
  const [text, setText] = useState('')
  const [azure, setAzure] = useState({
    projects: [],
    project: "",
    releases: [],
    release: "",
    issue: { title: "", description: "", type: "" }
  })
  const [jenkins, setJenkins] = useState({
    jobs: [],
    job: "",
    builds: [],
    build: "",
  })
  const [jira, setJira] = useState({
    projects: [],
    project: "",
    releases: [],
    release: "",
    issue: { title: "", description: "", type: "" }
  })

  // common methods
  const msg = useRef<any>(null);
  const scrollToBottom = () => {
    if (msg.current) {
      msg.current.scrollIntoView({ behaviour: "smooth" });
    }
  };

  // handle azure related methods
  const getAzureProjects = async () => {
    await axios.get(
      `http://localhost:8000/getAzureProjects`)
      .then(res => setAzure({
        ...azure, projects: res.data.data.value.map((pro: { id: string, name: string }) => {
          return {
            id: pro.id,
            name: pro.name
          }
        })
      })
      )
  };
  const getAzureProjectReleases = async (project: string) => {
    await axios.post(
      `http://localhost:8000/getAzureProjectReleases`, { project: project })
      // .then(res => console.log(res.data))
      .then(res => setAzure({
        ...azure, project: project, releases: res.data.data.status ?
          res.data.data.value.map((pro: { id: string, name: string }) => {
            return {
              id: pro.id,
              name: pro.name
            }
          }) : []
      })
      )
  };
  const createIssueInAzure = async () => {
    if (application !== "azure") return
    const issue = [
      {
        op: 'add',
        path: '/fields/System.Title',
        value: azure.issue.title,
      },
      {
        op: 'add',
        path: '/fields/System.Description',
        value: azure.issue.description,
      },
      {
        op: 'add',
        path: '/fields/System.WorkItemType',
        value: azure.issue.type
      },
    ];

    setConversation([...conversation, {
      message: <div>{text}</div>,
      user: "user",
      keyword: "azure activity"
    }, {
      message: <div style={{
        display: "flex",
        columnGap: "10px",
        alignItems: "center"
      }}>{azure.issue.type} creation is progress, please wait<div className="spinner"></div></div>,
      user: "system",
      keyword: "azure activity"
    }])

    await axios.post(
      `http://localhost:8000/createAzureIssue`, { project: azure.project, issue: issue })
      .then(res => {
        setTimeout(() => setConversation([...conversation, {
          message: <div>{text}</div>,
          user: "user",
          keyword: "azure activity"
        },
        {
          message: <div>
            <div><b>
              <span
                className="workitem"
                style={{
                  backgroundColor: azure.issue.type === "User Story" ?
                    "#90EE90" : azure.issue.type === "Bug" ?
                      "#FF7276" : azure.issue.type === "Task" ?
                        "#FFBF00" : "#ADD8E6"
                }}
              >{azure.issue.type} #{res.data.data.id}</span> has been succesfully created!</b>
            </div>
            <br></br>
            <div>which below activity you wish to perform on <b>{azure.project.toUpperCase()}</b> ?</div>
            <br></br>
            <div>{` - create an issue?`}</div>
          </div>,
          user: "system",
          keyword: "azure activity"
        }
        ]), 1000)
        setAzure({
          ...azure, issue: { title: "", description: "", type: "" }
        })
        setTimeout(() => scrollToBottom(), 1500)
      });
  }

  // handle jenkins related methods
  const formatDuration = (duration: any) => {
    const seconds = Math.floor(duration / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };
  const getJenkinsJobs = async () => {
    await axios.get(`http://localhost:8000/getjobs`)
      // .then(res => console.log(res.data.jobs))
      .then(res => setJenkins({
        ...jenkins, jobs: res.data.jobs.map((pro: { name: string }) => pro.name)
      })
      )
  }
  const getJenkinsJobBuilds = async () => {
    setConversation([...conversation, {
      message: <div>{text}</div>,
      user: "user",
      keyword: "jenkins activity"
    }, {
      message: <div>
        <div style={{
          display: "flex",
          columnGap: "10px",
          alignItems: "center"
        }}>build is in progress, please wait<div className="spinner"></div></div>
      </div>,
      user: "system",
      keyword: "jenkins activity"
    }])
    await axios.post(`http://localhost:8000/getjobbuilds`, { jobname: jenkins.job })
      // .then(res => console.log(res.data.builds))
      .then(res => {
        setTimeout(() => setConversation([...conversation, {
          message: <div>{text}</div>,
          user: "user",
          keyword: "jenkins activity"
        },
        {
          message: <div>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Build #</th>
                    <th>Status</th>
                    <th>Start Date & Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {res.data.builds.map((build: any, i: number) => <tr key={i}>
                    <td>{build.number}</td>
                    <td>{build.result}</td>
                    <td>{new Date(build.timestamp).toLocaleString()}</td>
                    <td>{formatDuration(build.duration)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <br></br>
            <div>which below activity you wish to perform on <b>{jenkins.job.toUpperCase()}</b> ?</div>
            <br></br>
            <div>{` - build?`}</div>
            <div>{` - get all builds?`}</div>
          </div>,
          user: "system",
          keyword: "jenkins activity"
        }
        ]), 1000)
        setJenkins({ ...jenkins, builds: res.data.builds })
      })
    setTimeout(() => scrollToBottom(), 1500)
  }
  const buildJenkinsJob = async () => {
    let beforeBuild: any;
    await axios.post(`http://localhost:8000/getlastbuild`, { jobname: jenkins.job, })
      .then(res => beforeBuild = res.data.build)
    await axios.post(`http://localhost:8000/buildjob`, { jobname: jenkins.job, })
      .then(res => setConversation([...conversation, {
        message: <div>{text}</div>,
        user: "user",
        keyword: "jenkins activity"
      }, {
        message: <div>
          <div>{res.data.data === "success" ?
            <div style={{
              display: "flex",
              columnGap: "10px",
              alignItems: "center"
            }}>build is in progress, please wait<div className="spinner"></div></div> :
            "unable to build !"}</div>
        </div>,
        user: "system",
        keyword: "jenkins activity"
      }]))
    await new Promise(resolve => setTimeout(resolve, 20000));
    let afterBuild: any;
    await axios.post(`http://localhost:8000/getlastbuild`, { jobname: jenkins.job, })
      .then(res => afterBuild = res.data.build)

    if (beforeBuild.number < afterBuild.number) {
      setTimeout(() => setConversation([...conversation, {
        message: <div>{text}</div>,
        user: "user",
        keyword: "jenkins activity"
      },
      {
        message: <div>
          <div><b>
            <span
              className="workitem"
              style={{ backgroundColor: "lightblue" }}
            >build #{afterBuild.id}</span> has been succesfully created
            <span>{afterBuild.result === "SUCCESS" ? " and " : " but "}</span>
            <span>{afterBuild.result === "SUCCESS" ?
              <span className="workitem" style={{ backgroundColor: "lightgreen" }}>completed</span> :
              <span className="workitem" style={{ backgroundColor: "lightcoral" }}>failed</span>}</span> !</b>
          </div>
          <br></br>
          <div>which below activity you wish to perform on <b>{jenkins.job.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - build?`}</div>
          <div>{` - get all builds?`}</div>
        </div>,
        user: "system",
        keyword: "jenkins activity"
      }
      ]), 1000)
      setTimeout(() => scrollToBottom(), 1500)
    }
  }

  // handle jira related methods
  const getJiraProjects = async () => {
    await axios.get(
      `http://localhost:8000/getJiraProjects`)
      .then(res => setJira({
        ...jira, projects: res.data.data.map((pro: { key: string, name: string }) => {
          return {
            id: pro.key,
            name: pro.name
          }
        })
      })
      )
  };
  const createIssueInJira = async () => {
    const pro: { id: string, name: string }[] = jira.projects.filter((p: { name: string }) => p.name === jira.project)
    const issue = {
      fields: {
        project: {
          key: pro[0].id
        },
        summary: jira.issue.title,
        description: jira.issue.description,
        issuetype: {
          name: jira.issue.type,
        },
      },
    };

    setConversation([...conversation, {
      message: <div>{text}</div>,
      user: "user",
      keyword: "jira activity"
    }, {
      message: <div style={{
        display: "flex",
        columnGap: "10px",
        alignItems: "center"
      }}>{jira.issue.type} creation is progress, please wait<div className="spinner"></div></div>,
      user: "system",
      keyword: "jira activity"
    }])

    await axios.post(
      `http://localhost:8000/createJiraIssue`, { issue: issue })
      // .then(res => console.log(res.data));
      .then(res => {
        setTimeout(() => setConversation([...conversation, {
          message: <div>{text}</div>,
          user: "user",
          keyword: "jira activity"
        },
        {
          message: <div>
            <div><b>
              <span
                className="workitem"
                style={{
                  backgroundColor: azure.issue.type === "User Story" ?
                    "#90EE90" : azure.issue.type === "Bug" ?
                      "#FF7276" : azure.issue.type === "Task" ?
                        "#FFBF00" : "#ADD8E6"
                }}
              >{jira.issue.type} #{res.data.data.id}</span> has been succesfully created!</b></div>
            <br></br>
            <div>which below activity you wish to perform on <b>{jira.project.toUpperCase()}</b> ?</div>
            <br></br>
            <div>{` - create an issue?`}</div>
          </div>,
          user: "system",
          keyword: "jira activity"
        }
        ]), 1000)
        setJira({ ...jira, issue: { title: "", description: "", type: "" } })
        setTimeout(() => scrollToBottom(), 1500)
      });
  }

  // handle application selection
  const handleApplicationSelection = (e: ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value
    if (option === application) return
    if (option === "") {
      setProject("")
      setAzure({
        projects: [], project: "", releases: [], release: "", issue: {
          title: "", description: "", type: ""
        }
      })
      setJenkins({ jobs: [], job: "", builds: [], build: "" })
      setJira({
        projects: [], project: "", releases: [], release: "", issue: {
          title: "", description: "", type: ""
        }
      })
    }
    setApplication(option)
    switch (option) {
      case "azure":
        setJira({
          projects: [], project: "", releases: [], release: "", issue: {
            title: "", description: "", type: ""
          }
        })
        setJenkins({ jobs: [], job: "", builds: [], build: "" })
        getAzureProjects()
        break;
      case "jenkins":
        setAzure({
          projects: [], project: "", releases: [], release: "", issue: {
            title: "", description: "", type: ""
          }
        })
        setJira({
          projects: [], project: "", releases: [], release: "", issue: {
            title: "", description: "", type: ""
          }
        })
        getJenkinsJobs()
        break;
      case "jira":
        setAzure({
          projects: [], project: "", releases: [], release: "", issue: {
            title: "", description: "", type: ""
          }
        })
        setJenkins({ jobs: [], job: "", builds: [], build: "" })
        getJiraProjects()
        break;
    }
  }

  // handle project selection
  const handleProjectSelection = (e: ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value
    setProject(option)
    if (!option.length) {
      setAzure({ ...azure, project: "" })
      setJenkins({ ...jenkins, job: "" })
      setJira({ ...jira, project: "" })
    }
    if (option === azure.project || option === jenkins.job || option === jira.project ||
      !option.length) return
    if (application === "azure") {
      setAzure({ ...azure, project: option })
    } else if (application === "jenkins") {
      setJenkins({ ...jenkins, job: option })
    } else if (application === "jira") {
      setJira({ ...jira, project: option })
    }
    if (application === "azure") {
      setConversation([...conversation, {
        message: <div>
          <div>which below activity you wish to perform on <b>{option.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "azure activity"
      }])
    } else if (application === "jenkins") {
      setConversation([...conversation, {
        message: <div>
          <div>which below activity you wish to perform on <b>{option.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - build?`}</div>
          <div>{` - get all builds?`}</div>
        </div>,
        user: "system",
        keyword: "jenkins activity"
      }])
    } else if (application === "jira") {
      setConversation([...conversation, {
        message: <div>
          <div>which below activity you wish to perform on <b>{option.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "jira activity"
      }])
    }
    getAzureProjectReleases(option)
    setTimeout(() => scrollToBottom(), 1)
  }

  // handle project release selection
  const handleProjectReleaseSelection = (e: ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value
    setRelease(option)
    if (!option.length) {
      setAzure({ ...azure, release: "" })
    }
    if (option === azure.release ||
      !option.length) return
    if (application === "azure") {
      setAzure({ ...azure, release: option })
    }
    if (application === "azure") {
      setConversation([...conversation, {
        message: <div>
          <div>which below activity you wish to perform on <b>{option.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - get stories and bugs with statuses?`}</div>
          <div>{` - get stories with statuses?`}</div>
          <div>{` - get bugs with statuses?`}</div>
        </div>,
        user: "system",
        keyword: "azure activity"
      }])
    }
    setTimeout(() => scrollToBottom(), 1)
  }

  // handle user input
  const handleUserInput = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
  }

  // handle send button click
  const handleSendClick = () => {
    setTimeout(() => scrollToBottom(), 1)

    // handle azure related conversations
    if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure activity" &&
      text.includes("issue")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue" },
      { message: <div>{`please provide an issue title`}</div>, user: "system", keyword: "azure issue title" }
      ]), 1000)
    } else if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure issue title") {
      setAzure({ ...azure, issue: { ...azure.issue, title: text } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue title" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue title" },
      { message: <div>{`please enter issue description`}</div>, user: "system", keyword: "azure issue description" }
      ]), 1000)
    } else if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure issue description") {
      setAzure({ ...azure, issue: { ...azure.issue, description: text } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue description" }
      ])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue description" },
      {
        message: <div>
          <div>please confirm on the issue type?</div>
          <br></br>
          <div> - epic</div>
          <div> - story</div>
          <div> - bug</div>
          <div> - task</div>
        </div>,
        user: "system",
        keyword: "azure issue type"
      },]), 1000)
    } else if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure issue type" &&
      (text.toLowerCase().includes("epic") || text.toLowerCase().includes("story") ||
        text.toLowerCase().includes("bug") || text.toLowerCase().includes("task"))) {
      const issuetype = text.toLowerCase().includes("epic") && !text.toLowerCase().includes("story") && !text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
        "Epic" : text.toLowerCase().includes("story") && !text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
          "User Story" : text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
            "Bug" : "Task"
      setAzure({ ...azure, issue: { ...azure.issue, type: issuetype } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue type" }
      ])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue type" },
      {
        message: <div className="confirmation">
          <div>please confirm to create an issue as per below?</div>
          <br></br>
          <div><b>Project:</b> {azure.project}</div>
          <div><b>Issue type:</b> {issuetype}</div>
          <div><b>Issue Title:</b> {azure.issue.title}</div>
          <div><b>Description:</b> {azure.issue.description}</div>
          <br></br>
          <div> - yes / no</div>
        </div>,
        user: "system",
        keyword: "azure issue confirmation"
      },]), 1000)
    } else if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure issue confirmation" &&
      text.toLowerCase().includes("yes")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure issue confirmation" },])
      createIssueInAzure()
    } else if (application === "azure" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "azure issue confirmation" &&
      text.toLowerCase().includes("no")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure activity" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure activity" },
      {
        message: <div>
          <div>ok let us start again, please chose one of the option below on <b>{azure.project.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "azure activity"
      }]), 1000)
    } else if (application === "azure") {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure activity" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "azure activity" },
      {
        message: <div>
          <div><span className="sorry">sorry</span>  you can request ONLY one of the option below on <b>{azure.project.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "azure activity"
      }]), 1000)
    }

    // handle jira related converstaions
    else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira activity" &&
      text.includes("issue")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue" },
      { message: <div>{`please provide an issue title`}</div>, user: "system", keyword: "jira issue title" }
      ]), 1000)
    } else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira issue title") {
      setJira({ ...jira, issue: { ...jira.issue, title: text } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue title" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue title" },
      { message: <div>{`please enter issue description`}</div>, user: "system", keyword: "jira issue description" }
      ]), 1000)
    } else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira issue description") {
      setJira({ ...jira, issue: { ...jira.issue, description: text } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue description" }
      ])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue description" },
      {
        message: <div>
          <div>please confirm on the issue type?</div>
          <br></br>
          <div> - epic</div>
          <div> - story</div>
          <div> - bug</div>
          <div> - task</div>
        </div>,
        user: "system",
        keyword: "jira issue type"
      },]), 1000)
    } else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira issue type" &&
      (text.toLowerCase().includes("epic") || text.toLowerCase().includes("story") ||
        text.toLowerCase().includes("bug") || text.toLowerCase().includes("task"))) {
      const issuetype = text.toLowerCase().includes("epic") && !text.toLowerCase().includes("story") && !text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
        "Epic" : text.toLowerCase().includes("story") && !text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
          "Story" : text.toLowerCase().includes("bug") && !text.toLowerCase().includes("task") ?
            "Bug" : "Task"
      setJira({ ...jira, issue: { ...jira.issue, type: issuetype } })
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue type" }
      ])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue type" },
      {
        message: <div className="confirmation">
          <div>please confirm to create an issue as per below?</div>
          <br></br>
          <div><b>Project:</b> {jira.project}</div>
          <div><b>Issue type:</b> {issuetype}</div>
          <div><b>Issue Title:</b> {jira.issue.title}</div>
          <div><b>Description:</b> {jira.issue.description}</div>
          <br></br>
          <div> - yes / no</div>
        </div>,
        user: "system",
        keyword: "jira issue confirmation"
      },]), 1000)
    } else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira issue confirmation" &&
      text.toLowerCase().includes("yes")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira issue confirmation" },])
      createIssueInJira()
    } else if (application === "jira" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jira issue confirmation" &&
      text.toLowerCase().includes("no")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira activity" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira activity" },
      {
        message: <div>
          <div>ok let us start again, please chose one of the option below on <b>{jira.project.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "jira activity"
      }]), 1000)
    } else if (application === "jira") {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira activity" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jira activity" },
      {
        message: <div>
          <div><span className="sorry">sorry</span>  you can request ONLY one of the option below on <b>{jira.project.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - create an issue?`}</div>
        </div>,
        user: "system",
        keyword: "jira activity"
      }]), 1000)
    }

    // handle jenkins related converstaions
    else if (application === "jenkins" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jenkins activity" &&
      (!text.includes("all") && text.includes("build") && text !== "builds")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "build" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "build" },
      {
        message: <div className="confirmation">
          <div>please confirm to build {jenkins.job} ?</div>
          <br></br>
          <div> - yes / no</div>
        </div>, user: "system", keyword: "jenkins build confirmation"
      }
      ]), 1000)
    } else if (application === "jenkins" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jenkins activity" &&
      ((text.includes("all") && text.includes("builds")) || text === "builds")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "all builds" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "all builds" },
      {
        message: <div className="confirmation">
          <div>please confirm on getting all builds for <b>{jenkins.job}</b> ?</div>
          <br></br>
          <div> - yes / no</div>
        </div>, user: "system", keyword: "jenkins all builds confirmation"
      }
      ]), 1000)
    } else if (application === "jenkins" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword === "jenkins build confirmation" &&
      text.toLowerCase().includes("yes")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "" },])
      buildJenkinsJob()
    } else if (application === "jenkins" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword.includes("confirmation") &&
      text.toLowerCase().includes("yes")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "" },])
      getJenkinsJobBuilds()
    } else if (application === "jenkins" &&
      conversation[conversation.length - 1].user === "system" &&
      conversation[conversation.length - 1].keyword.includes("confirmation") &&
      text.toLowerCase().includes("no")) {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jenkins activity" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "jenkins activity" },
      {
        message: <div>
          <div>ok let us start again, please chose one of the option below on <b>{jenkins.job.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - build?`}</div>
          <div>{` - get all builds?`}</div>
        </div>,
        user: "system",
        keyword: "jenkins activity"
      }]), 1000)
    } else if (application === "jenkins") {
      setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "" },])
      setTimeout(() => setConversation([...conversation,
      { message: <div>{text}</div>, user: "user", keyword: "" },
      {
        message: <div>
          <div><span className="sorry">sorry</span>  you can request ONLY one of the option below on <b>{jenkins.job.toUpperCase()}</b> ?</div>
          <br></br>
          <div>{` - build?`}</div>
          <div>{` - get all builds?`}</div>
        </div>,
        user: "system",
        keyword: "jenkins activity"
      }]), 1000)
    }

    setText("")
    setTimeout(() => scrollToBottom(), 1500)
  }

  // JSX code
  return (
    <div className="app">
      {/* header */}
      <div className="head">
        <h5>CHATBOT</h5>
      </div>
      {/* display messages */}
      <div className="display">
        <div className="messages"
          style={{
            justifyContent: conversation.length ? "" : "center",
            alignItems: conversation.length ? "" : "center",
          }}>
          {conversation.length ? conversation.map((c: { message: ReactNode, user: string }, i) =>
            <div className="message-wrapper" key={i}>
              <div
                className="message"
                style={{
                  float: c.user === "system" ? "left" : "right",
                  backgroundColor: c.user === "system" ? "#fff" : "#ccc"
                }}
              >{c.message}
              </div>
            </div>
          ) : <h4>please select an application followed by project/job to interact with chatbot</h4>}
          <div ref={msg} />
        </div>
      </div>
      <div className="input">
        <div className="user-input">
          <div className="filters">
            {/* select application */}
            <select
              className="application"
              value={application}
              onChange={(e) => handleApplicationSelection(e)}>
              <option value="">-- application --</option>
              {applications.map((app, i) =>
                <option key={i} value={app}>{app}</option>
              )}
            </select>
            {/* select azure/jenkins/jira projects */}
            {(application === "azure" && azure.projects.length) ||
              (application === "jenkins" && jenkins.jobs.length) ||
              (application === "jira" && jira.projects.length) ?
              <select
                className={jenkins.jobs.length ? "job" : "project"}
                value={project}
                onChange={(e) => handleProjectSelection(e)}
              >
                <option value="">{jenkins.jobs.length ? "-- job --" : "-- project --"}</option>
                {azure.projects.length ?
                  azure.projects.map((pro: { id: string, name: string }, i) =>
                    <option key={i} value={pro.name}>{pro.name}</option>) :
                  jenkins.jobs.length ?
                    jenkins.jobs.map((name, i) =>
                      <option key={i} value={name}>{name}</option>) :
                    jira.projects.length ?
                      jira.projects.map((pro: { id: string, name: string }, i) =>
                        <option key={i} value={pro.name}>{pro.name}</option>) :
                      ""
                }
              </select> : ""}
            {/* select azure/jira project releases */}
            {application === "azure" && azure.project.length && azure.releases.length ?
              <select
                className="release"
                value={release}
                onChange={(e) => handleProjectReleaseSelection(e)}
              >
                <option value="">-- release --</option>
                {azure.releases.length ? azure.releases.map((release: { name: string }, i) =>
                  <option key={i} value={release.name}>{release.name}</option>) :
                  ""}
              </select> : ""}
            {/* <div className="dates">
              <label>FROM</label>
              <input type="date" disabled={application.length ? false : true} />
              <label>TO</label>
              <input type="date" disabled={application.length ? false : true} />
            </div> */}
          </div>
          <div className="user-control">
            {/* user input on console */}
            <input
              type="text"
              value={text}
              placeholder="please type or speak to get a prompt..."
              onChange={(e) => handleUserInput(e)}
              disabled={azure.project.length || jenkins.job.length || jira.project.length ?
                false : true}
            />
            {/* speech */}
            <img
              className="speech"
              style={{
                pointerEvents: (azure.project.length || jenkins.job.length || jira.project.length) ? "all" : "none",
                opacity: (azure.project.length || jenkins.job.length || jira.project.length) ? ".9" : ".1",
              }}
              onClick={startListening}
              src={mic}
              alt="speech"
            />
            {/* send button */}
            <img
              className="send"
              style={{
                pointerEvents: (azure.project.length || jenkins.job.length || jira.project.length) &&
                  text.length ? "all" : "none",
                opacity: (azure.project.length || jenkins.job.length || jira.project.length) &&
                  text.length ? ".9" : ".1"
              }}
              onClick={() => handleSendClick()}
              src={send}
              alt="send"
            />
          </div>
        </div>
      </div>
      {/* footer */}
      <div className="foot">
        <div>Developed with Cognizant resources.</div>
      </div>
    </div>
  );
}

export default App;
