/*
 * FilesystemService.cpp
 *
 *  Created on: Sep 26, 2013
 *      Author: yuan
 */

#include "FilesystemService.h"
#include "nsXULAppAPI.h"

namespace mozilla {
namespace dom {
namespace filesystem {

StaticAutoPtr<FilesystemService> FilesystemService::sInstance;

FilesystemService::FilesystemService()
  : mIsChild(XRE_GetProcessType() != GeckoProcessType_Default)
{
}

/* static */
FilesystemService*
FilesystemService::GetInstance()
{
  if (!sInstance) {
    sInstance = new FilesystemService();
  }
  return sInstance;
}

}
}
}
