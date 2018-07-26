from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import SpatialDatasetServiceSetting
from tethys_sdk.app_settings import CustomSetting


class HydroshareGis(TethysAppBase):
    """
    Tethys app class for Hydroshare GIS.
    """

    name = 'HydroShare GIS'
    index = 'hydroshare_gis:home'
    icon = 'hydroshare_gis/images/cuahsi_logo.png'
    package = 'hydroshare_gis'
    root_url = 'hydroshare-gis'
    color = '#008080'
    description = 'View HydroShare Raster and Feature Resources and/or upload them from your computer.'
    tags = ''
    enable_feedback = False
    feedback_emails = []


    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='hydroshare-gis',
                controller='hydroshare_gis.controllers.home'
            ),
            UrlMap(
                name='add-layers',
                url='hydroshare-gis/ajax-add-layers',
                controller='hydroshare_gis.ajax_controllers.ajax_add_layers'
            ),
        )

        return url_maps


    def spatial_dataset_service_settings(self):
        """
        Example spatial_dataset_service_settings method.
        """
        sds_settings = (
            SpatialDatasetServiceSetting(
                name='default_geoserver',
                description='Spatial dataset service for app to use.',
                engine=SpatialDatasetServiceSetting.GEOSERVER,
                required=True,
            ),
        )

        return sds_settings


    def custom_settings(self):
        return (
            CustomSetting(
                name='geoserver',
                type=CustomSetting.TYPE_STRING,
                description='Spatial dataset service for the app to use.',
                required=True
            ),
        )
