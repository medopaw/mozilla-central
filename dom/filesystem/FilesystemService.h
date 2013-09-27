/*
 * FilesystemService.h
 *
 *  Created on: Sep 26, 2013
 *      Author: yuan
 */
#ifndef mozilla_dom_filesystemservice_h__
#define mozilla_dom_filesystemservice_h__

#include "mozilla/StaticPtr.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class FilesystemService
{
public:
  ~FilesystemService() {}

  /**
   * Static method to return the singleton instance.
   */
  static FilesystemService* GetInstance();

private:
  FilesystemService();

  static StaticAutoPtr<FilesystemService> sInstance;

  // Whether current process is the child process.
  bool mIsChild;
};

}
}
}

#endif // mozilla_dom_filesystemservice_h__
