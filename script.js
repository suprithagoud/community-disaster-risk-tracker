// =========================================================
// GLOBAL UTILITY FUNCTIONS
// =========================================================
function el(sel){return document.querySelector(sel)}
function elAll(sel){return Array.from(document.querySelectorAll(sel))}

function showToast(msg){ 
    const toast = el('#toast'); 
    el('#toastMessage').textContent = msg; 
    toast.classList.add('show'); 
    setTimeout(()=>toast.classList.remove('show'), 3000); 
}

function showModal(id){ 
    el(`#${id}`).style.display='flex'; 
}

function hideModal(id){ 
    el(`#${id}`).style.display='none'; 
}

// =========================================================
// MAIN APP
// =========================================================

(function(){

// =========================================================
// CONFIG
// =========================================================

const OPENWEATHERMAP_API_KEY = '653df96fdaf351cc43d2b1b989745ddf';

// =========================================================
// FLOOD RISK DATA
// =========================================================

const highRiskAreas = [
    { lat: 17.4250, lng: 78.4467, name: "Hussain Sagar Lake Area" },
    { lat: 17.3650, lng: 78.4767, name: "Musi River Banks" },
    { lat: 17.4050, lng: 78.5167, name: "Kukatpally Low-Lying Areas" }
];

const mediumRiskAreas = [
    { lat: 17.4450, lng: 78.3867, name: "Banjara Hills" },
    { lat: 17.3450, lng: 78.5567, name: "L.B. Nagar" },
    { lat: 17.4950, lng: 78.3967, name: "Secunderabad" }
];

const shelters = [
    { lat: 17.3850, lng: 78.4867, name: "GHMC Emergency Shelter" },
    { lat: 17.4250, lng: 78.4467, name: "Hussain Sagar Shelter" },
    { lat: 17.3650, lng: 78.4767, name: "Musi River Shelter" }
];

// =========================================================
// STATIC CONTACTS
// =========================================================

const contacts = [
{
    name:"Greater Hyderabad Municipal Corporation",
    type:"Municipal Authority",
    phone:"040-21111111",
    address:"GHMC Head Office",
    lat:17.3850,
    lng:78.4867
},
{
    name:"Emergency Disaster Response",
    type:"Emergency Service",
    phone:"108",
    address:"Telangana State Emergency Services",
    lat:17.3900,
    lng:78.4800
},
{
    name:"Fire Brigade",
    type:"Emergency Service",
    phone:"101",
    address:"Hyderabad Fire Department",
    lat:17.3950,
    lng:78.4700
},
{
    name:"Emergency Shelter - Secunderabad",
    type:"Shelter",
    phone:"040-27810010",
    address:"Secunderabad Community Hall",
    lat:17.4950,
    lng:78.3967
}
];

// =========================================================
// DYNAMIC HOSPITALS
// =========================================================

let dynamicHospitals = [];

// =========================================================
// FETCH NEARBY HOSPITALS
// =========================================================

async function fetchNearbyHospitals(lat, lon){

    try{

        const query = `
[out:json];
(
node["amenity"="hospital"](around:8000,${lat},${lon});
);
out;
`;

        const response = await fetch(
            "https://overpass-api.de/api/interpreter",
            {
                method:"POST",
                body:query
            }
        );

        const data = await response.json();

        dynamicHospitals = data.elements.map(h => ({

            name: h.tags.name || "Unnamed Hospital",

            type: "Hospital",

            phone: "N/A",

            address: "Nearby Area",

            lat: h.lat,

            lng: h.lon,

            distance: calculateDistance(
                lat,
                lon,
                h.lat,
                h.lon
            )

        }));

        dynamicHospitals.sort(
            (a,b)=>a.distance-b.distance
        );

        dynamicHospitals = dynamicHospitals.slice(0,6);

        renderContacts([
            ...contacts,
            ...dynamicHospitals
        ]);

    }catch(err){

        console.error(err);

        showToast("Failed to fetch nearby hospitals");

    }

}

// =========================================================
// DISTANCE CALCULATION
// =========================================================

function calculateDistance(lat1, lon1, lat2, lon2){

    const R = 6371;

    const dLat = (lat2-lat1) * Math.PI/180;

    const dLon = (lon2-lon1) * Math.PI/180;

    const a =

        Math.sin(dLat/2) *
        Math.sin(dLat/2)

        +

        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180)

        *

        Math.sin(dLon/2) *
        Math.sin(dLon/2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1-a)
        );

    return R * c;

}

// =========================================================
// STATE
// =========================================================

let userCoords = null;
let map, userMarker, riskLayerGroup, shelterGroup, routeLayer;

// =========================================================
// INIT
// =========================================================

document.addEventListener('DOMContentLoaded', initApp);

function initApp(){

    initMap();

    detectLocation();

    loadInitialData();

    setupEventListeners();

    checkLoginStatus();

    setupBackToTop();

}

// =========================================================
// MAP
// =========================================================

function initMap(){

    map = L.map('map').setView([17.3850,78.4867], 12);

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            attribution:'&copy; OpenStreetMap contributors'
        }
    ).addTo(map);

    riskLayerGroup = L.layerGroup().addTo(map);

    shelterGroup = L.layerGroup().addTo(map);

    plotRiskAreas();

    plotShelters();

}

function plotRiskAreas(){

    riskLayerGroup.clearLayers();

    highRiskAreas.forEach(a=>{

        L.circle(
            [a.lat,a.lng],
            {
                color:'red',
                fillColor:'red',
                fillOpacity:0.5,
                radius:600
            }
        )
        .addTo(riskLayerGroup)
        .bindPopup(`<b>${a.name}</b><br>High Flood Risk`);

    });

    mediumRiskAreas.forEach(a=>{

        L.circle(
            [a.lat,a.lng],
            {
                color:'#fbbc05',
                fillColor:'#fbbc05',
                fillOpacity:0.5,
                radius:400
            }
        )
        .addTo(riskLayerGroup)
        .bindPopup(`<b>${a.name}</b><br>Medium Flood Risk`);

    });

}

function plotShelters(){

    shelterGroup.clearLayers();

    shelters.forEach(s=>{

        L.marker(
            [s.lat,s.lng],
            {
                icon:L.icon({
                    iconUrl:'https://cdn-icons-png.flaticon.com/512/252/252025.png',
                    iconSize:[28,28]
                })
            }
        )
        .addTo(shelterGroup)
        .bindPopup(`<b>${s.name}</b><br>Emergency Shelter`);

    });

}

// =========================================================
// WEATHER
// =========================================================

function loadWeather(lat=17.3850,lng=78.4867){

    const spinner = el('#weatherSpinner');

    spinner.style.display='block';

    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`)
    .then(res=>res.json())
    .then(data=>{

        spinner.style.display='none';

        renderWeather([data]);

        el('#weatherSummary').textContent =
        `${data.weather[0].main}, Wind: ${data.wind.speed.toFixed(1)} m/s`;

    })
    .catch(err=>{

        spinner.style.display='none';

        console.error(err);

        showToast('Failed to fetch weather');

    });

}

function renderWeather(dataArr){

    const container = el('#weatherDashboard');

    container.innerHTML='';

    dataArr.forEach(d=>{

        const iconClass = getWeatherIcon(d.weather[0].main);

        let alertBadge = '';

        const card = document.createElement('div');

        card.className='weather-card';

        if (
            d.weather[0].main.toLowerCase() === 'rain' ||
            d.weather[0].main.toLowerCase() === 'thunderstorm'
        ) {

            card.style.background =
            'linear-gradient(135deg, var(--danger), #ff8a65)';

            alertBadge =
            '<div class="alert-badge">Heavy Rain Warning</div>';

        } else {

            card.style.background =
            'linear-gradient(135deg,#1e90ff,#00bfff)';

        }

        card.innerHTML=`
        <div class="weather-icon">
            <i class="${iconClass}"></i>
        </div>

        <div class="temp">
            ${d.main.temp.toFixed(1)}°C
        </div>

        <div>
            ${d.weather[0].description}
        </div>

        ${alertBadge}
        `;

        container.appendChild(card);

    });

}

function getWeatherIcon(main){

    switch(main.toLowerCase()){

        case 'clear':
            return 'fas fa-sun';

        case 'clouds':
            return 'fas fa-cloud';

        case 'rain':
            return 'fas fa-cloud-showers-heavy';

        case 'thunderstorm':
            return 'fas fa-bolt';

        case 'snow':
            return 'fas fa-snowflake';

        case 'drizzle':
            return 'fas fa-cloud-rain';

        default:
            return 'fas fa-cloud';

    }

}

// =========================================================
// LOCATION
// =========================================================

function detectLocation(){

    if(navigator.geolocation){

        navigator.geolocation.getCurrentPosition(

            pos=>{

                userCoords=[
                    pos.coords.latitude,
                    pos.coords.longitude
                ];

                el('#currentLocation').textContent =
                `Lat:${pos.coords.latitude.toFixed(2)} Lon:${pos.coords.longitude.toFixed(2)}`;

                if(userMarker){
                    map.removeLayer(userMarker);
                }

                userMarker =
                L.marker(userCoords)
                .addTo(map)
                .bindPopup('You are here')
                .openPopup();

                map.setView(userCoords,12);

                loadWeather(
                    pos.coords.latitude,
                    pos.coords.longitude
                );

                fetchNearbyHospitals(
                    pos.coords.latitude,
                    pos.coords.longitude
                );

            },

            err=>{

                console.warn(err);

                showToast('Location access denied');

                loadWeather();

            }

        );

    }else{

        showToast('Geolocation not supported');

        loadWeather();

    }

}

// =========================================================
// CONTACTS
// =========================================================

function loadInitialData(){

    renderContacts(contacts);

    loadPosts();

}

function renderContacts(list){

    const container = el('#contactsContainer');

    container.innerHTML='';

    list.forEach(c=>{

        const card = document.createElement('div');

        card.className='contact-card';

        card.innerHTML=`

        <b>${c.name}</b>

        <div>${c.type}</div>

        <div>${c.phone}</div>

        <div class="contact-actions">

            <button
            class="contact-btn btn-call"
            onclick="callContact('${c.phone}')"
            style="background:#ddd;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">

            <i class="fas fa-phone"></i> Call

            </button>

            <button
            class="contact-btn btn-map"
            onclick="showContactOnMap(${c.lat},${c.lng},'${c.name}')"
            style="background:#ddd;border:none;padding:6px 10px;border-radius:4px;cursor:pointer">

            <i class="fas fa-map-marker-alt"></i> View Map

            </button>

        </div>
        `;

        container.appendChild(card);

    });

}

window.callContact = function(phone){

    showToast(`Calling ${phone}...`);

}

window.showContactOnMap = function(lat,lng,name){

    map.setView([lat,lng],15);

    L.marker([lat,lng])
    .addTo(map)
    .bindPopup(`<b>${name}</b>`)
    .openPopup();

}

// =========================================================
// COMMUNITY POSTS (FULL FIXED VERSION)
// =========================================================

let posts = [];

function savePosts(){

    localStorage.setItem(
        'communityPosts',
        JSON.stringify(posts)
    );

}

function loadPosts(){

    try{

        const savedPosts =
        localStorage.getItem('communityPosts');

        if(
            savedPosts &&
            savedPosts !== "undefined" &&
            savedPosts !== "null"
        ){

            posts = JSON.parse(savedPosts);

            if(!Array.isArray(posts)){
                posts = [];
            }

        }else{

            posts = [
                {
                    user:'Admin',
                    content:'Stay safe! Avoid flood-prone areas.'
                }
            ];

        }

    }catch(error){

        console.error("Post loading error:", error);

        localStorage.removeItem('communityPosts');

        posts = [
            {
                user:'Admin',
                content:'Stay safe! Avoid flood-prone areas.'
            }
        ];

    }

    renderPosts();

}

function renderPosts(){

    const container = el('#communityFeed');

    container.innerHTML = '';

    if(posts.length === 0){

        container.innerHTML = `
            <div style="padding:10px;color:gray">
                No community updates yet.
            </div>
        `;

        return;

    }

    posts.forEach(p=>{

        const div = document.createElement('div');

        div.className = 'post';

        div.innerHTML = `
            <b>${p.user}</b>: ${p.content}
        `;

        container.appendChild(div);

    });

}

// =========================================================
// LOGIN STATUS
// =========================================================

function checkLoginStatus(){

    const username =
    localStorage.getItem('rainalertUser');

    if(username){

        el('#loginBtn').textContent =
        `Welcome, ${username}`;

    }

}

// =========================================================
// BACK TO TOP
// =========================================================

function setupBackToTop(){

    const backToTopBtn = el("#backToTopBtn");

    window.onscroll = function(){

        if(
            document.body.scrollTop > 200 ||
            document.documentElement.scrollTop > 200
        ){

            backToTopBtn.style.display = "block";

        }else{

            backToTopBtn.style.display = "none";

        }

    };

}

window.topFunction = function(){

    document.body.scrollTop = 0;

    document.documentElement.scrollTop = 0;

}

// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners(){

    el('#newPostBtn').onclick=()=>{

        el('#postForm').style.display='block';

    };

    el('#cancelPost').onclick=()=>{

        el('#postForm').style.display='none';

    };

    el('#submitPost').onclick=()=>{

        const val =
        el('#postContent').value.trim();

        if(val){

            posts.unshift({

                user:
                localStorage.getItem('rainalertUser')
                || 'Guest',

                content:val

            });

            el('#postContent').value='';

            el('#postForm').style.display='none';

            savePosts();

            renderPosts();

            showToast('Post submitted');

        }else{

            showToast('Cannot post empty message');

        }

    };

}

})();