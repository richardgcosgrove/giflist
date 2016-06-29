import {Component} from '@angular/core';
import {Modal, NavController, Alert} from 'ionic-angular';
import {InAppBrowser} from 'ionic-native';
import {Http} from '@angular/http';
import {SettingsPage} from '../settings/settings';
import {Data} from '../../providers/data/data';
import {FORM_DIRECTIVES, Control} from '@angular/common';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';

@Component({
    templateUrl: 'build/pages/home/home.html',
    providers: [Data]
})
export class HomePage {
    settings: any;
    loading: boolean = false;
    posts: any = [];
    subreddit: string = 'gifs';
    page: number = 1;
    perPage: number = 15;
    after: string;
    stopIndex: number;
    sort: string = 'hot'
    moreCount: number = 0;
    subredditValue: string;

    subredditControl: Control;

    constructor(public http: Http, public dataService: Data, public nav: NavController) {
        this.subredditControl = new Control();

        this.subredditControl
            .valueChanges
            .debounceTime(2000)
            .distinctUntilChanged()
            .subscribe(subreddit => {
                if (subreddit != '' && subreddit) {
                    this.subreddit = subreddit;
                    this.changeSubreddit();
                }

            });

        this.loadSettings();

    }

    changeSubreddit(): void {
        this.reset();
        this.fetchData();
    }

    fetchData(): void {
        let url = this.getUrl();

        //We are now currently fetching data, so set the loading variable to true
        this.loading = true;
        //Make a Http request to the URL and subscribe to the response
        this.http.get(url)
            .map(res => res.json())
            .subscribe(data => {
                let stopIndex = this.posts.length;
                this.posts = this.posts.concat(data.data.children);

                this.filterPosts(stopIndex);

                //We are done loading now so change the loading variable back
                this.loading = false;

                //Keep fetching more GIFs if we didn't retrieve enough to fill a page
                //But give up after 20 tries if we still don't have enough
                this.processData(data);

            }, (err) => {
                //Fail silently, in this case the loading spinner will just continue to display
                console.log("subreddit doesn't exist!");
            });
    }

    filterPosts(stopIndex: number) {

        //Loop through all NEW posts that have been added. We are looping through
        //in reverse since we are removing some items.
        for (let i = this.posts.length - 1; i >= stopIndex; i--) {
            this.processPost(i);


        }
    }

    getUrl(): string {
        //Build the URL that will be used to access the API based on the users current preferences
        let url = 'https://www.reddit.com/r/' + this.subreddit + '/' + this.sort + '/.json?limit=' + this.perPage;

        //If we aren't on the first page, we need to add the after parameter so that we only get new results
        //this parameter basically says "give me the posts that come AFTER this post"
        if (this.after) {
            url += '&after=' + this.after;
        }
        return url;
    }

    loadMore(): void {
        ++this.page;
        this.fetchData();

    }

    loadSettings(): void {
        this.fetchData();
    }

    openSettings(): void {
        console.log("TODO: Implement openSettings()");
    }

    playVideo(e, post): void {

        //Create a reference to the video
        let video = e.target;
        //Set the loader animation in the right position
        post.loaderOffset = e.target.offsetTop + 20 + "px";

        //Toggle the video playing
        if (video.paused) {
            //Show the loader gif
            post.showLoader = true;
            video.play();
            //Once the video starts playing, remove the loader gif
            video.addEventListener("playing", function(e) {
                post.showLoader = false;
            });
        } else {
            video.pause();
        }

    }


    processData(data: any): void {
        if (data.data.children.length === 0 || this.moreCount > 20) {
            let alert = Alert.create({
                title: 'Oops!',
                subTitle: 'Having trouble finding GIFs - try another subreddit, sort order, or increase the page size in your settings.',
                buttons: ['Ok']
            });

            this.nav.present(alert);
            this.moreCount = 0;

        } else {
            this.after = data.data.children[data.data.children.length - 1].data.name;

            if (this.posts.length < this.perPage * this.page) {
                this.fetchData();
                ++this.moreCount;
            } else {
                this.moreCount = 0;
            }

        }
    }

    processPost(i: number): void {
        let post = this.posts[i];

        //Add a new property that will later be used to toggle a loading animation
        //for individual posts
        post.showLoader = false;

        //Add a NSFW thumbnail to NSFW posts
        if (post.data.thumbnail == 'nsfw') {
            this.posts[i].data.thumbnail = 'images/nsfw.png';
        }

        /*
        * Remove all posts that are not in the .gifv or .webm format and
        convert the ones that
        * are to .mp4 files.
        */
        if (post.data.url.indexOf('.gifv') > -1 ||
            post.data.url.indexOf('.webm') > -1) {
            this.posts[i].data.url = post.data.url.replace('.gifv', '.mp4').replace('.webm', '.mp4');

            //If a preview image is available, assign it to the post as 'snapshot'
            if (typeof (post.data.preview) != "undefined") {
                this.posts[i].data.snapshot =
                    post.data.preview.images[0].source.url.replace(/&amp;/g, '&');
                //If the snapshot is undefined, change it to be blank so it doesnt use a broken image
                if (this.posts[i].data.snapshot == "undefined") {
                    this.posts[i].data.snapshot = "";
                }
            }
            else {
                this.posts[i].data.snapshot = "";
            }
        }
        else {
            this.posts.splice(i, 1);
        }
    }

    reset(): void {
      this.page = 1;
      this.posts = [];
      this.after = null;
    }

    showComments(post): void {
        InAppBrowser.open('http://reddit.com' + post.data.permalink, '_system',
            'location=yes');
    }

}
