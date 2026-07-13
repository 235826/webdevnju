import { CommonJSFileDetector, Configuration, Inject } from "@midwayjs/core";
import * as koa from "@midwayjs/koa";
import { join } from "node:path";
import { CourseListHttpMiddleware } from "./middleware/course-list-http.middleware";

@Configuration({
  imports: [koa],
  importConfigs: [join(__dirname, "./config")],
  detector: new CommonJSFileDetector(),
})
export class MainConfiguration {
  @Inject()
  koaFramework: koa.Framework;

  async onReady() {
    this.koaFramework.useMiddleware([CourseListHttpMiddleware]);
  }
}
