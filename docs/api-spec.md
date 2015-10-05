## Specification

Each service on Dorian is described by uploading a data.json file.

### Service

Properties:

**service** (string)

Name of the service

**slug** (string)

Unique slug used to store and view the data on Dorian. Should only contain characters valid in a URL (so no spaces).

**datetime** (string)

[ISO date string](https://en.wikipedia.org/wiki/ISO_8601) representing the time the screenshots were taken.

**journeys** (array)

Array of journey objects

### Journey

Properties:

**name** (string)

Name of the journey

**slug** (string)

Slug used to store and view data on Dorian. Each journey needs a unique slug within a service.

**screens** (array)

Array of screen objects

### Screen

Properties:

**name** (string)

Name of the screen

**slug** (string)

Slug used to store and view data on Dorian. Each screen needs a unique slug within a journey.

**image-filename** (string)

The name of the file for this screen. Each screen should have a unique filename within a journey.

## Example:

```
{
  "service": "GOV.UK Verify",
  "slug": "govuk-verify",
  "datetime": "2015-09-01T12:25:21.025Z",
  "journeys": [
    {
      "name": "Register",
      "slug": "register",
      "screens": [
        {
          "name": "Start",
          "slug": "start",
          "image-filename": "01-start.png"
        },
        {
          "name": "First time",
          "slug": "first-time",
          "image-filename": "02-first-time.png"
        },
        {
          "name": "Sign in",
          "slug": "sign-in",
          "image-filename": "03-sign-in.png"
        }
      ]
    }
  ]
}
```
