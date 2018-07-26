from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import *

from .app import HydroshareGis as app


WORKSPACE = 'hydroshare_gis'
GEOSERVER_URI = 'http://www.example.com/hydroshare_gis'


@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    context = {

    }

    return render(request, 'hydroshare_gis/home.html', context)
