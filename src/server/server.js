const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const port = 8000;

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//JENKINS ------------------------------------------------------------
const jenkinsServer = process.env.REACT_APP_JENKINS_SERVER;
const crumbIssuerApiUrl = `${jenkinsServer}/crumbIssuer/api/json`;
const jenkinsUsername = process.env.REACT_APP_JENKINS_USERNAME;
const jenkinsApiToken = process.env.REACT_APP_JENKINS_API_TOKEN;

app.post('/triggerjob', async (req, res) => {
  const jobName = req.body.jobname;
  const crumbResponse = await axios.get(crumbIssuerApiUrl, {
    auth: {
      username: jenkinsUsername,
      password: jenkinsApiToken,
    },
  });
  const crumb = crumbResponse.data.crumb;
  const crumbHeader = crumbResponse.data.crumbRequestField;

  await axios.post(`${jenkinsServer}/job/${jobName}/build`,
    {},
    {
      headers: {
        [crumbHeader]: crumb,
        Authorization: `Basic ${Buffer.from(`${jenkinsUsername}:${jenkinsApiToken}`).toString('base64')}`,
      },
    }
  );
  res.json({ msg: 'done' })
})

app.get('/getjobs', async (req, res) => {
  const crumbResponse = await axios.get(crumbIssuerApiUrl, {
    auth: {
      username: jenkinsUsername,
      password: jenkinsApiToken,
    },
  });
  const crumb = crumbResponse.data.crumb;
  const crumbHeader = crumbResponse.data.crumbRequestField;
  let jobs;
  await axios.get(`${jenkinsServer}/api/json`,
    {},
    {
      headers: {
        [crumbHeader]: crumb,
        Authorization: `Basic ${Buffer.from(`${jenkinsUsername}:${jenkinsApiToken}`).toString('base64')}`,
      },
    }
  ).then(res => jobs = res.data.jobs);
  res.json({ jobs: jobs })
})

app.post('/getbuilds', async (req, res) => {
  const jobname = req.body.jobname
  const crumbResponse = await axios.get(crumbIssuerApiUrl, {
    auth: {
      username: jenkinsUsername,
      password: jenkinsApiToken,
    },
  });
  const crumb = crumbResponse.data.crumb;
  const crumbHeader = crumbResponse.data.crumbRequestField;
  let builds;
  await axios.get(`${jenkinsServer}/job/${jobname}/api/json`,
    {},
    {
      headers: {
        [crumbHeader]: crumb,
        Authorization: `Basic ${Buffer.from(`${jenkinsUsername}:${jenkinsApiToken}`).toString('base64')}`,
      },
    }
  ).then(res => builds = res.data.builds);
  res.json({ builds: builds })
})

//JIRA ---------------------------------------------------------------
const jiraEmail = process.env.REACT_APP_JIRA_EMAIL;
const jiraAPIToken = process.env.REACT_APP_JIRA_API_TOKEN

app.post('/createJiraIssue', async (req, res) => {
  const issue = req.body.issue
  const jiraCredentials = `${jiraEmail}:${jiraAPIToken}`
  const base64Credentials = btoa(jiraCredentials);
  let data;

  await axios.post(
    'https://cognizant-testplattform.atlassian.net/rest/api/2/issue',
    issue,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Credentials}`,
      },
    }
  ).then(res => data = res.data);
  res.json({ data: data })
})

//AZURE --------------------------------------------------------------
const azureDevOpsOrganization = process.env.REACT_APP_AZURE_DEVOPS_ORGANIZATION;
const azureDevOpsProject = process.env.REACT_APP_AZURE_DEVOPS_PROJECT
const azureDevOpsPersonalAccessToken = process.env.REACT_APP_AZURE_DEVOPS_API_TOKEN

app.post('/createAzureIssue', async (req, res) => {
  const issue = req.body.issue
  let data;

  await axios.post(
    `https://dev.azure.com/${azureDevOpsOrganization}/${azureDevOpsProject}/_apis/wit/workitems/$Issue?api-version=7.1`,
    issue,
    {
      headers: {
        'Content-Type': 'application/json-patch+json',
        Authorization: `Basic ${btoa(`:${azureDevOpsPersonalAccessToken}`)}`,
      },
    }
  ).then(res => data = res.data);
  res.json({ data: data })
})

app.listen(port, () => {
  console.log(`server listening on port ${port}`)
})