from .app import HydroshareGis


def get_user_workspace(request):

    workspace = HydroshareGis.get_user_workspace(request).path

    return workspace
