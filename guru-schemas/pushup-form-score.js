import { Color, Keypoint, MovementAnalyzer, Position } from "guru/stdlib";

export default class GuruSchema {
  constructor() {
    this.personFrames = [];
    this.reps = [];
    this.hipKneeAngles = [];
    this.elbowShoulderAngle = [];
  }

  async processFrame(frame) {
    const people = await frame.findObjects("person");
    const person = people[0];

    this.personFrames.push(person);

    this.reps = MovementAnalyzer.repsByKeypointDistance(
      this.personFrames,
      Keypoint.leftElbow,
      Keypoint.leftShoulder,
      { threshold: 0.1 }
    );
    this.hipKneeAngles = this.reps.map((rep) => {
      return MovementAnalyzer.angleBetweenKeypoints(
        rep.middleFrame,
        Keypoint.rightKnee,
        Keypoint.rightHip
      );
    });

    this.elbowShoulderAngle = this.reps.map((rep) => {
      return MovementAnalyzer.angleBetweenKeypoints(
        rep.middleFrame,
        Keypoint.leftElbow,
        Keypoint.leftShoulder
      );
    });

    return this.outputs();
  }

  renderFrame(frameCanvas) {
    if (this.personFrames.length > 0) {
      frameCanvas.drawBoundingBox(this.personFrames, new Color(93, 236, 201));
      frameCanvas.drawSkeleton(
        this.personFrames,
        new Color(97, 50, 255),
        new Color(255, 255, 255)
      );

      const person =
        this.personFrames.find(
          (frameObject) => frameObject.timestamp >= frameCanvas.timestamp
        ) || this.personFrames[this.personFrames.length - 1];
      if (person) {
        const kneeLocation = person.keypoints[Keypoint.rightKnee];
        const hipLocation = person.keypoints[Keypoint.rightHip];
        const elbowLocation = person.keypoints[Keypoint.leftElbow];
        const shoulderLocation = person.keypoints[Keypoint.leftShoulder];
        const elbowShoulderAngle = MovementAnalyzer.angleBetweenKeypoints(
          person,
          Keypoint.leftElbow,
          Keypoint.leftShoulder
        );

        frameCanvas.drawTriangle(
          elbowLocation,
          shoulderLocation,
          new Position(elbowLocation.x, shoulderLocation.y),
          {
            backgroundColor:
              elbowShoulderAngle > 0
                ? new Color(232, 92, 92)
                : new Color(93, 236, 201),
            alpha: 0.75,
          }
        );

        if (this.reps && this.reps.length > 0) {
          let repIndex = this.reps.findIndex((rep) => {
            return (
              frameCanvas.timestamp >= rep.startFrame.timestamp &&
              frameCanvas.timestamp <= rep.endFrame.timestamp
            );
          });

          if (
            frameCanvas.timestamp >
            this.reps[this.reps.length - 1].endFrame.timestamp
          ) {
            repIndex = this.reps.length - 1;
          }

          if (repIndex >= 0) {
            const rep = this.reps[repIndex];
            const repAlpha =
              1.0 -
              Math.abs(rep.middleFrame.timestamp - frameCanvas.timestamp) /
                (rep.endFrame.timestamp - rep.startFrame.timestamp);
            const hipKneeAngle = Math.round(this.hipKneeAngles[repIndex]);
            const elbowShoulderAngle = Math.round(
              this.elbowShoulderAngle[repIndex]
            );
            const badForm = elbowShoulderAngle > 2;

            const repDescription = badForm ? "Bad rep! Go lower!" : "Good rep!";

            frameCanvas.drawText(
              `Rep ${repIndex + 1} -- ${repDescription}`,
              new Position(0.1, 0.1),
              new Color(255, 255, 255),
              {
                fontSize: 26,
                backgroundColor: badForm
                  ? new Color(232, 92, 92)
                  : new Color(94, 49, 255),
                padding: 4,
              }
            );
          }
        }
      }
    }
  }

  async outputs() {
    return {
      reps: this.reps,
      hipKneeAngles: this.hipKneeAngles,
    };
  }
}
