from setuptools import setup, find_namespace_packages
from tethys_apps.app_installation import find_resource_files

# ### Apps Definition ###
app_package = 'hydroshare_gis'
release_package = 'tethysapp-' + app_package

# ### Python Dependencies ###
dependencies = ['hs-restclient', 'xmltodict', 'GDAL']

resource_files = find_resource_files('tethysapp/' + app_package + '/templates', 'tethysapp/' + app_package)
resource_files += find_resource_files('tethysapp/' + app_package + '/public', 'tethysapp/' + app_package)
resource_files += find_resource_files('tethysapp/' + app_package + '/workspaces', 'tethysapp/' + app_package)

setup(
    name='HydroShare GIS',
    version='1.0',
    description='View HydroShare Raster and Feature Resources and/or upload them from your computer.',
    long_description='',
    keywords='',
    author='Shawn Crawley',
    author_email='scrawley@byu.edu',
    url='',
    license='The MIT License (MIT)',
    packages=find_namespace_packages(exclude=['ez_setup', 'examples', 'tests']),
    include_package_data=True,
    zip_safe=False,
    install_requires=dependencies,

)
