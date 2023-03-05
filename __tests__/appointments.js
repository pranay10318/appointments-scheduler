/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
const { response } = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Appointments Scheduling Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admins").send({
      firstName: "Test",
      lastName: "User A",
      email: "userA@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/welcome");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/welcome");
    expect(res.statusCode).toBe(302);
  });

  //   test("Creates a new appointment ", async () => {
  //     const agent = request.agent(server);
  //     await login(agent, "userA@test.com", "12345678");
  //     const resss=await agent.get("/welcome");
  //     const csrfToken = extractCsrfToken(resss);

  //     const response = await agent.post("/create-appointment").send({
  //       description: "NEw appointment",
  //       startTime: "10:00",
  //       endTime: "11:00",
  //       _csrf: csrfToken,
  //     });
  //     console.log("succesfully submitted  but the response code not found...",response);
  //     expect(response.statusCode).toBe(302);
  //   });

  //   test("Deletes an appointment ", async () => {
  //     const agent = request.agent(server);
  //     await login(agent, "userA@test.com", "12345678");

  //     let res = await agent.get("/welcome");
  //     let csrfToken = extractCsrfToken(res);

  //      await agent.post("/create-appointment").send({
  //         description: "NEw appointment-2",
  //         startTime: "11:00",
  //         endTime: "12:00",
  //         _csrf: csrfToken,
  //       });
  //     const groupedElectionsResponse = await agent
  //       .get("/welcome")
  //       .set("Accept", "application/json");

  //     const parsedGroupedResponse = JSON.parse(groupedElectionsResponse.text);

  //     const allElectionsCount = parsedGroupedResponse.allElections.length;
  //     const latestElection = parsedGroupedResponse.allElections[allElectionsCount - 1];
  //     console.log("here's your latest election broooooooooooooo..........................",latestElection);

  //     res = await agent.get("/elections");
  //     csrfToken = extractCsrfToken(res);

  //     const deleteResponse = await agent.delete(`/elections/${latestElection.id}`).send({
  //       _csrf: csrfToken,
  //     });

  //     const deletestatus = JSON.parse(deleteResponse.text);

  //     deletestatus
  //       ? expect(deletestatus.success).toBe(true)
  //       : expect(deletestatus.success).toBe(false);
  //   });
});
