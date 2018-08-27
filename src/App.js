import React, { Component } from 'react';
import './App.css';
import queryString from 'query-string';

let defaultStyle = {
  color: '#fff'
};
let fakeServerData = {
  user: {
    name: 'David',
    playlists: [
      {
        name: 'My favorites',
        songs: [
          {name: 'Beat It', duration: 1345}, 
          {name: 'Cannelloni Makaroni', duration: 1236},
          {name: 'Rosa helikopter', duration: 70000}
        ]
      }
    ]
  }
};

class PlaylistCounter extends Component {
  render() {
    return (
      <div style={{...defaultStyle, width: '40%', display: 'inline-block'}}>
        <h2>{this.props.playlists.length} playlists</h2>
      </div>
    );
  }
}

class HoursCounter extends Component {
  render() {
    let totalDuration = this.props.playlists.reduce((sum, eachPlaylist) => {
      return sum + eachPlaylist.totalDurationInSeconds;
    }, 0);

    return (
      <div style={{...defaultStyle, width: '40%', display: 'inline-block'}}>
        <h2>{Math.round(totalDuration/60)} minutes</h2>
      </div>
    );
  }
}

class Filter extends Component {
  render() {
    return (
      <div style={defaultStyle}>
        <img/>
        <input type="text" onChange={event => this.props.onTextChange(event.target.value)}/>
        Filter
      </div>
    );
  }
}

class Playlist extends Component {
  render() {
    let playlist = this.props.playlist;    

    return (
      <div style={{...defaultStyle, width: '20%', display: 'inline-block'}}>
        <img src={playlist.imageUrl} style={{width: '60px'}}/>
        <h3>{playlist.name}</h3>
        <ul>
          {
            playlist.songs.map(song =>
              <li>{song.name}</li>
            )
          }
        </ul>
      </div>
    );
  }
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      serverData: {},
      filterString: ''
    };
  }

  componentDidMount() {
    let parsed = queryString.parse(window.location.search);
    let accessToken = parsed.access_token;

    if (accessToken) {
      fetch('https://api.spotify.com/v1/me', {
        headers: {'Authorization': 'Bearer ' + accessToken},
      })
      .then(response => response.json())
      .then(data => this.setState({user: {name: data.display_name}}));

      fetch('https://api.spotify.com/v1/me/playlists', {
        headers: {'Authorization': 'Bearer ' + accessToken},
      })
      .then(response => response.json())
      .then(playlistData => {
        let playlists = playlistData.items;
        let trackDataPromises = playlists.map(playlist => {
          let responsePromise = fetch(playlist.tracks.href, {headers: {'Authorization': 'Bearer ' + accessToken}});
          let trackDataPromise = responsePromise.then(response => response.json());
          return trackDataPromise;
        });
        
        let allTracksDataPromises = Promise.all(trackDataPromises);
        let playlistsPromise = allTracksDataPromises.then(trackDatas => {
          trackDatas.forEach((trackData, i) => {
            playlists[i].trackDatas = trackData.items
            .map(item => item.track)
            .map(track => ({
              name: track.name,
              duration: track.duration_ms / 1000
            }))
          });
          return playlists;
        });

        return playlistsPromise;
      })
      .then(playlists => this.setState({
        playlists: playlists.map(playlist => {
          return {
            name: playlist.name, 
            imageUrl: playlist.images[0].url,
            songs: playlist.trackDatas.slice(0, 3),
            totalDurationInSeconds: playlist.trackDatas.reduce((totalDurationInSeconds, track) => {
              return totalDurationInSeconds + track.duration
            }, 0)
          }
        })
      }));
    }
  }

  render() {
    let playlistsToRender = 
      this.state.user && 
      this.state.playlists 
        ? this.state.playlists.filter(playlist => {
          let matchesPlaylist = playlist.name.toLowerCase().includes(this.state.filterString.toLowerCase());
          let matchesSong = playlist.songs.some(song => song.name.toLowerCase().includes(this.state.filterString.toLowerCase()))
          return matchesPlaylist || matchesSong
        }) : [];

    return (
      <div className="App">
        {
          this.state.user ? 
            <div>
              <h1 style={{...defaultStyle, 'fontSize': '54px'}}>
                {this.state.user.name}'s Playlists
              </h1>
              <PlaylistCounter playlists={playlistsToRender}/>
              <HoursCounter playlists={playlistsToRender} />
              <Filter onTextChange={text => this.setState({filterString: text})}/>
              {
                playlistsToRender.map(playlist => 
                  <Playlist playlist={playlist}/>
                )
              }
            </div> : 
            <button onClick={() => {
              window.location = window.location.href.includes('localhost') 
              ? 'http://localhost:8888/login' 
              : 'https://better-playlists-backend-dave.herokuapp.com/login' }
            }
            style={{padding: '20px', 'fontSize': '50px', 'marginTop': '20px'}}>Sign in with Spotify</button>
        }
      </div>
    );
  }
}

export default App;
