### Docker Compose

Deploying with docker is the easiest way.

run: docker-compose up -d

And you should be off to the races! Don't forget to create your .env file.

### Deploy to Deno.com

Deploying to deno.com is my recommended environment. As they support the newest APIs.
All you need to do is:

1. fork the repo to your own github account
2. login to Deno Deploy
3. Select the repo
4. Deploy (this will fail)
5. Set the environment variables

Now you will be deployed to Deno.com.

---

### Deploy to Vercel.com

At this time it looks as though Deno is not fully supported by Vercel. And the format that they want the
functions to be created in is not the way I have developed this addon.

In closing, I don't think it is possible to deploy to Vercel.
BUT I could be wrong, if you find a solution please share!