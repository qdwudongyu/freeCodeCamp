import request from 'request';
import { isMongoId } from 'validator';
import dedent from 'dedent';

import constantStrings from '../utils/constantStrings.json';
import testimonials from '../resources/testimonials.json';
import { wrapHandledError } from '../utils/create-handled-error';

const githubClient = process.env.GITHUB_ID;
const githubSecret = process.env.GITHUB_SECRET;

module.exports = function(app) {
  const router = app.loopback.Router();
  const User = app.models.User;

  router.get('/api/github', githubCalls);
  router.get('/chat', chat);
  router.get('/twitch', twitch);
  router.get('/u/:email', unsubscribe);
  router.get('/unsubscribe/:email', unsubscribe);
  router.get('/z', unsubscribeAnon);
  router.get(
    '/the-fastest-web-page-on-the-internet',
    theFastestWebPageOnTheInternet
  );
  router.get('/unsubscribed', unsubscribed);
  router.get('/nonprofits', nonprofits);
  router.get('/nonprofits-form', nonprofitsForm);
  router.get('/pmi-acp-agile-project-managers', agileProjectManagers);
  router.get('/pmi-acp-agile-project-managers-form', agileProjectManagersForm);
  router.get('/coding-bootcamp-cost-calculator', bootcampCalculator);
  router.get('/stories', showTestimonials);
  router.get('/all-stories', showAllTestimonials);
  router.get('/how-nonprofit-projects-work', howNonprofitProjectsWork);
  router.get(
      '/software-resources-for-nonprofits',
      softwareResourcesForNonprofits
  );
  router.get('/academic-honesty', academicHonesty);

  app.use(router);

  function chat(req, res) {
    res.redirect('https://gitter.im/FreeCodeCamp/FreeCodeCamp');
  }

  function howNonprofitProjectsWork(req, res) {
      res.redirect(301,
        'https://medium.freecodecamp.com/open-source-for-good-1a0ea9f32d5a');

  }

  function softwareResourcesForNonprofits(req, res) {
    res.render('resources/software-resources-for-nonprofits', {
      title: 'Software Resources for Nonprofits'
    });
  }

  function academicHonesty(req, res) {
      res.render('resources/academic-honesty', {
          title: 'Academic Honesty policy'
      });
  }

  function theFastestWebPageOnTheInternet(req, res) {
    res.render('resources/the-fastest-web-page-on-the-internet', {
      title: 'This is the fastest web page on the internet'
    });
  }

  function showTestimonials(req, res) {
    res.render('resources/stories', {
      title: 'Testimonials from Happy freeCodeCamp Students ' +
        'who got Software Engineer Jobs',
      stories: testimonials.slice(0, 72),
      moreStories: true
    });
  }

  function showAllTestimonials(req, res) {
    res.render('resources/stories', {
      title: 'Testimonials from Happy freeCodeCamp Students ' +
        'who got Software Engineer Jobs',
      stories: testimonials,
      moreStories: false
    });
  }

  function bootcampCalculator(req, res) {
    res.render('resources/calculator', {
      title: 'Coding Bootcamp Cost Calculator'
    });
  }

  function nonprofits(req, res) {
    res.render('resources/nonprofits', {
      title: 'Your Nonprofit Can Get Pro Bono Code'
    });
  }

  function nonprofitsForm(req, res) {
    res.render('resources/nonprofits-form', {
      title: 'Nonprofit Projects Proposal Form'
    });
  }

  function agileProjectManagers(req, res) {
    res.render('resources/pmi-acp-agile-project-managers', {
      title: 'Get Agile Project Management Experience for the PMI-ACP'
    });
  }

  function agileProjectManagersForm(req, res) {
    res.render('resources/pmi-acp-agile-project-managers-form', {
      title: 'Agile Project Management Program Application Form'
    });
  }

  function twitch(req, res) {
    res.redirect('https://twitch.tv/freecodecamp');
  }

  function unsubscribeAnon(req, res, next) {
    const { query: { unsubscribeId } } = req;
    const isValid = unsubscribeId && isMongoId(unsubscribeId);
    if (!isValid) {
      throw wrapHandledError(
        new Error('unsubscribeId is not a mongo ObjectId'),
        {
          message: dedent`
            Oops... something is not right. We could not unsubscribe that email
            address
          `,
          type: 'danger',
          redirectTo: '/'
        }
      );
    }
    User.findOne({
      where: { unsubscribeId }
    }, (err, user) => {
      if (err) { return next(err); }
      if (!user || !user.email) {
        throw wrapHandledError(
          new Error('No user or user email to unsubscribe'),
          {
            message: dedent`
              We couldn't find a user account to unsubscribe, are you clicking
              a link from an email we sent?
            `,
            type: 'info',
            redirectTo: '/'
          }
        );
      }
      return user.update$({
        sendQuincyEmail: false
      }).subscribe(() => {
        req.flash(
          'info',
          'We\'ve successfully updated your Email preferences.'
        );
        return res.redirect('/unsubscribed');
      },
        next,
        () => {
          return user.manualReload();
        }
      );
    });
  }

  function unsubscribe(req, res, next) {
    req.checkParams(
      'email',
      `"${req.params.email}" isn't a valid email address.`
    ).isEmail();
    const errors = req.validationErrors(true);
    if (errors) {
      req.flash('error', { msg: errors.email.msg });
      return res.redirect('/');
    }
    return User.find({
      where: {
        email: req.params.email
      }
    }, (err, users) => {
      if (err) { return next(err); }
      if (!users.length) {
        req.flash('info', {
          msg: 'Email address not found. Please update your Email ' +
            'preferences from your settings.'
        });
        return res.redirect('/');
      }

      const updates = users.map(user => {
        return new Promise((resolve, reject) =>
          user.updateAttributes({
            sendQuincyEmail: false
          }, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          })
        );
      });
      return Promise.all(updates)
        .then(() => {
          req.flash('info', {
            msg: 'We\'ve successfully updated your Email preferences.'
          });
          return res.redirect('/unsubscribed');
        })
        .catch(next);
    });
  }

  function unsubscribed(req, res) {
    res.render('resources/unsubscribed', {
      title: 'You have been unsubscribed'
    });
  }

  function githubCalls(req, res, next) {
    var githubHeaders = {
      headers: {
        'User-Agent': constantStrings.gitHubUserAgent
      },
      port: 80
    };
    request(
      [
        'https://api.github.com/repos/freecodecamp/',
        'freecodecamp/pulls?client_id=',
        githubClient,
        '&client_secret=',
        githubSecret
      ].join(''),
      githubHeaders,
      function(err, status1, pulls) {
        if (err) { return next(err); }
        pulls = pulls ?
          Object.keys(JSON.parse(pulls)).length :
          'Can\'t connect to github';

        return request(
          [
            'https://api.github.com/repos/freecodecamp/',
            'freecodecamp/issues?client_id=',
            githubClient,
            '&client_secret=',
            githubSecret
          ].join(''),
          githubHeaders,
          function(err, status2, issues) {
            if (err) { return next(err); }
            issues = ((pulls === parseInt(pulls, 10)) && issues) ?
            Object.keys(JSON.parse(issues)).length - pulls :
              "Can't connect to GitHub";
            return res.send({
              issues: issues,
              pulls: pulls
            });
          }
        );
      }
    );
  }
};
